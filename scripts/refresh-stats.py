"""
refresh-stats.py
Reads the MVP1 database, writes data/stats.json, then commits and pushes to GitHub.

data/stats.json is PUBLIC. It describes the system (what the monitoring engine
refreshes, how consistently it runs) and never the owner's book: no dollar
amounts, contract/transaction/account counts, or per-day trade counts.

Usage:
    python scripts/refresh-stats.py

Requirements:
    pip install pyodbc exchange_calendars

Configuration:
    Set the DB_* variables below to match your SQL Server connection.
"""

import json
import os
import subprocess
import sys
from datetime import date, datetime, timezone

try:
    import pyodbc
except ImportError:
    print("ERROR: pyodbc not installed. Run: pip install pyodbc")
    sys.exit(1)

try:
    import exchange_calendars
except ImportError:
    print("ERROR: exchange_calendars not installed. Run: pip install exchange_calendars")
    sys.exit(1)

# ── CONNECTION CONFIG ────────────────────────────────────────────────
# Matches D:\Work\OTSUllu\MVP1\.env.prd
DB_SERVER   = r"localhost\SQLEXPRESS"
DB_NAME     = "UlluMVP1DB"
DB_DRIVER   = "ODBC Driver 18 for SQL Server"
DB_TRUSTED  = True                     # Windows Auth — no username/password needed

# ── PATHS ────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(REPO_ROOT, "data", "stats.json")


def get_connection_string():
    return (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        f"Trusted_Connection=yes;"
        f"TrustServerCertificate=yes;"
    )


# DTE phases shown on the site: (key, label, first month, last month or None = to date).
# Boundaries are editorial: move them here when the strategy shifts again.
DTE_PHASES = [
    ("early", "Early: short DTE",  "2025-06", "2025-09"),
    ("long",  "Long-DTE era",      "2025-10", "2026-08"),
    ("now",   "Now: short DTE",    "2026-09", None),
]


def fetch_dte_phases(cursor):
    """Contract-weighted DTE-at-open per phase. Open legs weigh by remaining qty.

    Public output carries only averages and percentages, never contract counts.
    """
    cursor.execute("""
        WITH [cteSrc] AS (
            SELECT FORMAT([OpnDT], 'yyyy-MM')                 AS [Mon],
                   DATEDIFF(day, [OpnDT], [ExprDT])            AS [DTE],
                   ABS(COALESCE(NULLIF([MtchQty], 0), [RemOpnQty], [OpnQty], 0)) AS [Qty]
            FROM [trade].[vwOptionTrade]
            WHERE [IsShort] = 1
        )
        SELECT [Mon], SUM([Qty]),
               SUM([DTE] * [Qty]),
               SUM(CASE WHEN [DTE] <= 30 THEN [Qty] ELSE 0 END),
               SUM(CASE WHEN [DTE] >  90 THEN [Qty] ELSE 0 END)
        FROM [cteSrc] GROUP BY [Mon]
    """)
    months = cursor.fetchall()
    phases = []
    for key, label, first, last in DTE_PHASES:
        rows = [r for r in months if r[0] >= first and (last is None or r[0] <= last)]
        qty = sum(r[1] for r in rows)
        if not qty:
            continue
        phases.append({
            "key":       key,
            "label":     label,
            "from":      min(r[0] for r in rows),
            "to":        max(r[0] for r in rows),
            "avgDte":    round(sum(r[2] for r in rows) / qty),
            "pctUpTo30": round(sum(r[3] for r in rows) * 100 / qty),
            "pctOver90": round(sum(r[4] for r in rows) * 100 / qty),
        })
    return phases


def fetch_calendar(cursor):
    """Calendar days vs NYSE sessions vs days traded, first trade through today.

    Market sessions come from the official NYSE (XNYS) calendar, not a
    hand-typed holiday list. Only the traded DATES are published, never how
    many trades happened on a day.
    """
    cursor.execute(
        "SELECT DISTINCT [TransactionDate] "
        f"FROM [trade].[vwOptionsTransaction] WHERE {TRADED_ONLY} ORDER BY [TransactionDate]"
    )
    traded = [str(r[0]) for r in cursor.fetchall()]
    if not traded:
        return None
    start = date.fromisoformat(traded[0])
    end = max(date.today(), date.fromisoformat(traded[-1]))

    xnys = exchange_calendars.get_calendar("XNYS")
    sessions = {d.date() for d in xnys.sessions_in_range(start.isoformat(), end.isoformat())}
    # Weekday market closures (holidays, special closures) in the span.
    holidays = []
    d = start
    while d <= end:
        if d.weekday() < 5 and d not in sessions:
            holidays.append(d.isoformat())
        d = date.fromordinal(d.toordinal() + 1)

    return {
        "start":          start.isoformat(),
        "end":            end.isoformat(),
        "calendarDays":   (end - start).days + 1,
        "marketSessions": len(sessions),
        "tradedDays":     len(traded),
        "holidays":       holidays,
        "tradedDates":    traded,
    }


# "Traded" = a contract sold to open or bought to close (calls and puts; rolls
# count both legs). Expirations, assignments and exercises are not trades.
# Match on how each broker STARTS those records: ordinary trade text can
# contain "EXPIRES <date>", so a contains-match would drop real trades.
TRADED_ONLY = ("NOT ([Action] LIKE 'Option Expired%' OR [Action] LIKE 'Option Assigned%' "
               "OR [Action] LIKE 'Option Exercised%' OR [Action] LIKE 'EXPIRED %' "
               "OR [Action] LIKE 'ASSIGNED %' OR [Action] LIKE 'EXERCISED %')")


def fetch_activity(cursor):
    """Trading activity, published only as counts of days/symbols and percentages.

    PRIVACY: never add dollar amounts, total contract or transaction counts or
    account counts here. data/stats.json is public. The one exception, chosen
    by the owner on 2026-11-16: per-ticker contract counts with their share.
    """
    cursor.execute(f"""
        SELECT COUNT(DISTINCT [SYM]),
               COUNT(DISTINCT [TransactionDate]),
               SUM(CASE WHEN [OT] = 'C' THEN ABS([Quantity]) ELSE 0 END),
               SUM(ABS([Quantity]))
        FROM [trade].[vwOptionsTransaction]
        WHERE {TRADED_ONLY}
    """)
    underlyings, trading_days, cc, total = cursor.fetchone()
    cc_pct = round(cc * 100 / total) if total else 0

    # Contracts traded per ticker and share of all contracts traded.
    # Extra rows let the site hide tickers.
    cursor.execute(
        "SELECT TOP 15 [SYM], SUM(ABS([Quantity])) FROM [trade].[vwOptionsTransaction] "
        f"WHERE {TRADED_ONLY} GROUP BY [SYM] ORDER BY SUM(ABS([Quantity])) DESC"
    )
    top = [
        {"sym": sym, "contracts": int(qty), "pct": round(qty * 100 / total, 1) if total else 0}
        for sym, qty in cursor.fetchall()
    ]
    return {
        "underlyings":    int(underlyings),
        "tradingDays":    int(trading_days),
        "ccPct":          cc_pct,
        "cspPct":         100 - cc_pct if total else 0,
        "topUnderlyings": top,
    }


# Columns that are bookkeeping, not market data. They are not counted as fields.
AUDIT_COLUMNS = ("TimeCreated", "TimeUpdated")
# The monitoring loop waits 15 min between runs
# (03-A-mvp1-etl-quote-and-options-synch.cmd, WAIT_SECS=900).
REFRESH_MINUTES = 15


def fetch_surveillance(cursor):
    """What the LATEST monitoring cycle actually refreshed.

    The cycle is anchored on the [mkt].[OptionChain] rows written by the most
    recent chain run. Rows left over from symbols no longer held, or from
    earlier runs, are not counted. Market data is written just before the
    chain, so its window opens 10 minutes earlier.
    """
    cursor.execute(f"""
        SET NOCOUNT ON;
        DECLARE @Last DATETIME2 = (SELECT MAX([TimeUpdated]) FROM [mkt].[OptionChain]);
        DECLARE @Start DATETIME2 = (SELECT MIN([TimeUpdated]) FROM [mkt].[OptionChain]
                                    WHERE [TimeUpdated] > DATEADD(minute, -{REFRESH_MINUTES}, @Last));
        SELECT
            (SELECT COUNT(*) FROM [mkt].[OptionChain] WHERE [TimeUpdated] >= @Start),
            (SELECT COUNT(DISTINCT [SYM]) FROM [mkt].[OptionChain] WHERE [TimeUpdated] >= @Start),
            (SELECT COUNT(*) FROM [mkt].[OptionsQuote]
              WHERE [TimeUpdated] BETWEEN DATEADD(minute, -1, @Start) AND DATEADD(minute, 1, @Last)),
            (SELECT COUNT(*) FROM [mkt].[MarketData]
              WHERE [TimeUpdated] BETWEEN DATEADD(minute, -10, @Start) AND DATEADD(minute, 1, @Last)),
            @Start, @Last
    """)
    chain, symbols, quotes, market, cycle_start, cycle_end = cursor.fetchone()

    def fields(table):
        marks = ",".join("?" * len(AUDIT_COLUMNS))
        cursor.execute(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
            f"WHERE TABLE_SCHEMA = 'mkt' AND TABLE_NAME = ? AND COLUMN_NAME NOT IN ({marks})",
            (table, *AUDIT_COLUMNS),
        )
        return cursor.fetchone()[0]

    option_fields = fields("OptionChain")
    quote_fields  = fields("OptionsQuote")
    market_fields = fields("MarketData")
    return {
        "symbolsMonitored":   int(symbols),
        "rowsPerCycle":       int(chain + quotes + market),
        "optionFields":       option_fields,
        "stockFields":        market_fields,
        "dataPointsPerCycle": int(chain * option_fields + quotes * quote_fields + market * market_fields),
        "refreshMinutes":     REFRESH_MINUTES,
        "dataStreams":        3,
        "cycleDate":          cycle_end.date().isoformat() if cycle_end else None,
    }


# DTE bands come from the MVP1 dashboard's own function, so the website and the
# dashboard use the same band math. It scopes to one user via SESSION_CONTEXT,
# so it runs once per user and the per-band sums are added: SYSTEM-WIDE.
MVP1_DASHBOARD_REPO = r"D:\Work\OTSUllu\MVP1\src\app\web\dashboard\repo.py"
DTE_BAND_META = [  # key, name, range; mirrors BANDS in MVP1 static/js/dte.js
    ("fire",    "FIRE",         "<6d"),
    ("manage",  "MANAGE",       "6–19d"),
    ("harvest", "HARVEST",      "20–40d"),
    ("ramp",    "RAMP",         "41–90d"),
    ("slow",    "SLOW",         "91–180d"),
    ("stale",   "STALE",        "181–365d"),
    ("leap1",   "LEAP 12–18mo", "366–547d"),
    ("leap2",   "LEAP 18–24mo", "548–730d"),
    ("leap3",   "LEAP >24mo",   ">730d"),
]


def _band_yield(tpd, cptl):
    """Same capital-weighted formula as bandCagr() in MVP1 dte.js: pool the
    band (sum TPD / sum capital), compound daily for a year. A projection from
    today's time value, not a realized return."""
    if not cptl or cptl <= 0:
        return None
    r = tpd / cptl
    if r > 6.0 or r < -0.99:
        return None
    return round(((1 + r) ** 365 - 1) * 100, 1)


def fetch_dte_bands(conn):
    """Public DTE band view: PERCENTAGES and projected yield only.

    PRIVACY: no capital, TPD/PPD, premium, P&L or position counts are published.
    """
    import importlib.util
    spec = importlib.util.spec_from_file_location("mvp1_dashboard_repo", MVP1_DASHBOARD_REPO)
    repo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(repo)

    cur = conn.cursor()
    cur.execute("SELECT DISTINCT [User.RecId] FROM [core].[Account] WHERE [User.RecId] IS NOT NULL")
    users = [r[0] for r in cur.fetchall()]
    raw = {}
    for user_id in users:
        cur.execute("EXEC sp_set_session_context @key = N'UserRecId', @value = ?", user_id)
        for b in repo.get_dte_bands(conn)["bands"]:
            acc = raw.setdefault(b["key"], {"cptl": 0.0, "tpd_day": 0.0})
            acc["cptl"]    += b.get("cptl", 0.0)
            acc["tpd_day"] += b.get("tpd_day", 0.0)
    cur.execute("EXEC sp_set_session_context @key = N'UserRecId', @value = NULL")

    # Cross-check: the per-user sums must cover every open short position.
    cur.execute("SELECT COUNT(DISTINCT [AcNum]) FROM [rpt].[vwOpenOptionPosition] WHERE [IsShort] = 1 "
                "AND [AcNum] NOT IN (SELECT [AcNum] FROM [core].[Account] WHERE [User.RecId] IS NOT NULL)")
    orphan_accounts = cur.fetchone()[0]
    if orphan_accounts:
        print(f"WARNING: {orphan_accounts} account(s) with open shorts have no user; not in DTE bands.")

    tot_cptl = sum(max(0.0, raw.get(k, {}).get("cptl", 0.0)) for k, _, _ in DTE_BAND_META)
    tot_tpd  = sum(max(0.0, raw.get(k, {}).get("tpd_day", 0.0)) for k, _, _ in DTE_BAND_META)
    bands = []
    for key, name, rng in DTE_BAND_META:
        b = raw.get(key, {})
        cptl, tpd = b.get("cptl", 0.0), b.get("tpd_day", 0.0)
        bands.append({
            "key":        key,
            "name":       name,
            "range":      rng,
            "capitalPct": round(max(0.0, cptl) * 100 / tot_cptl, 1) if tot_cptl else 0,
            "tpdPct":     round(max(0.0, tpd) * 100 / tot_tpd, 1) if tot_tpd else 0,
            "yieldPct":   _band_yield(tpd, cptl),
        })
    return {"asOf": date.today().isoformat(), "bands": bands,
            "totalYieldPct": _band_yield(tot_tpd, tot_cptl)}


def fetch_stats():
    print(f"Connecting to {DB_SERVER}/{DB_NAME}...")
    conn = pyodbc.connect(get_connection_string(), timeout=30)
    cursor = conn.cursor()

    data = {
        "activity":     fetch_activity(cursor),
        "surveillance": fetch_surveillance(cursor),
        "dteBands":     fetch_dte_bands(conn),
        "dtePhases":    fetch_dte_phases(cursor),
        "calendar":     fetch_calendar(cursor),
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "source":      "refresh-stats.py",
        },
    }
    conn.close()
    return data


def write_json(data):
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    print(f"Written: {OUTPUT_FILE}")


def git_push():
    os.chdir(REPO_ROOT)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    subprocess.run(["git", "add", "data/stats.json"], check=True)

    result = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        capture_output=True
    )
    if result.returncode == 0:
        print("No changes to stats.json — already up to date.")
        return

    subprocess.run(
        ["git", "commit", "-m", f"chore: refresh website stats [{timestamp}]"],
        check=True
    )
    subprocess.run(["git", "push", "origin", "main"], check=True)
    print("Pushed to GitHub.")


if __name__ == "__main__":
    try:
        stats = fetch_stats()
        write_json(stats)
        git_push()
        print("Done.")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
