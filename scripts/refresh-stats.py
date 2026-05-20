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
