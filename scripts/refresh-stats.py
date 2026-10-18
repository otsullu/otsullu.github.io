"""
refresh-stats.py
Calls [api].[usp_q_WebsiteStats] on the MVP1 database,
writes the result to data/stats.json, then commits and pushes to GitHub.

Usage:
    python scripts/refresh-stats.py

Requirements:
    pip install pyodbc

Configuration:
    Set the DB_* variables below to match your SQL Server connection.
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

try:
    import pyodbc
except ImportError:
    print("ERROR: pyodbc not installed. Run: pip install pyodbc")
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
    """Contract-weighted DTE-at-open per phase. Open legs weigh by remaining qty."""
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
            "contracts": int(qty),
            "avgDte":    round(sum(r[2] for r in rows) / qty),
            "pctUpTo30": round(sum(r[3] for r in rows) * 100 / qty),
            "pctOver90": round(sum(r[4] for r in rows) * 100 / qty),
        })
    return phases


def fetch_stats():
    print(f"Connecting to {DB_SERVER}/{DB_NAME}...")
    conn = pyodbc.connect(get_connection_string(), timeout=30)
    cursor = conn.cursor()

    print("Executing [api].[usp_q_WebsiteStats]...")
    cursor.execute("EXEC [api].[usp_q_WebsiteStats]")
    row = cursor.fetchone()

    if not row:
        raise RuntimeError("Stored procedure returned no results.")

    raw_json = row[0]
    data = json.loads(raw_json)

    # Top 15 (not 10) so the site can hide tickers (HIDDEN_TICKERS in app.js)
    # and still fill 10 slots.
    cursor.execute(
        "SELECT TOP 15 [SYM], SUM(ABS([Quantity])) "
        "FROM [trade].[vwOptionsTransaction] "
        "GROUP BY [SYM] ORDER BY SUM(ABS([Quantity])) DESC"
    )
    data["trade"]["topTickers"] = [
        {"sym": sym, "contracts": int(qty)} for sym, qty in cursor.fetchall()
    ]

    data["dtePhases"] = fetch_dte_phases(cursor)
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
