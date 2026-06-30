import os
import json
import threading
import sqlite3
from server.config import STATS_FILE, DB_FILE

stats_lock = threading.Lock()
global_stats = {}

def load_stats():
    global global_stats
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, "r", encoding="utf-8") as f:
                global_stats = json.load(f)
        except Exception:
            pass
    if "offset" not in global_stats:
        global_stats["offset"] = 0
    if "daily_date" not in global_stats:
        global_stats["daily_date"] = ""
    for p in ["all", "daily"]:
        if p not in global_stats:
            global_stats[p] = {"kills": {}, "deaths": {}, "weapons": {}, "relationships": {}}
        if "relationships" not in global_stats[p]:
            global_stats[p]["relationships"] = {}
        for key in ["hits", "headshots", "triple_kills", "max_streak"]:
            if key not in global_stats[p]:
                global_stats[p][key] = {}
        if "hit_locations" not in global_stats[p]:
            global_stats[p]["hit_locations"] = {}
    if "history" not in global_stats:
        global_stats["history"] = []
    if "baselines" not in global_stats:
        global_stats["baselines"] = {}

def save_stats():
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(global_stats, f)

def migrate_history_to_db():
    try:
        from server.database import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        if "history" in global_stats and global_stats["history"]:
            for item in global_stats["history"]:
                c.execute("SELECT id FROM matches WHERE map = ? AND date = ?", (item["map"], item["date"]))
                if not c.fetchone():
                    c.execute("INSERT INTO matches (map, date, mvp, kills, scoreboard) VALUES (?, ?, ?, ?, ?)",
                              (item["map"], item["date"], item["mvp"], item["kills"], json.dumps([])))
            conn.commit()
            global_stats["history"] = []
            save_stats()
        conn.close()
    except Exception as e:
        print("Migração falhou:", e)
