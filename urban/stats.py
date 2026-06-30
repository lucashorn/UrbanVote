import os
import json
import threading
import sqlite3
from core.config import STATS_FILE, DB_FILE, clean_name

stats_lock = threading.Lock()
global_stats = {}

cached_match_stats = {}
cached_match_stats_lock = threading.Lock()

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
        from core.database import get_db_connection
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

def get_match_stats():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT mvp, scoreboard, duration FROM matches")
    rows = c.fetchall()
    conn.close()
    
    stats = {}
    for mvp, scoreboard_json, duration in rows:
        match_duration = duration if duration is not None else 0.0
        if mvp and mvp != "Ninguém":
            clean_mvp = clean_name(mvp)
            if clean_mvp not in stats:
                stats[clean_mvp] = { "matches": 0, "mvps": 0, "max_kills": 0, "playtime": 0.0 }
            stats[clean_mvp]["mvps"] += 1
            
        if scoreboard_json:
            try:
                scoreboard = json.loads(scoreboard_json)
                for entry in scoreboard:
                    p = clean_name(entry["player"])
                    if p not in stats:
                        stats[p] = { "matches": 0, "mvps": 0, "max_kills": 0, "playtime": 0.0 }
                    stats[p]["matches"] += 1
                    stats[p]["max_kills"] = max(stats[p]["max_kills"], entry.get("kills", 0))
                    stats[p]["playtime"] += match_duration
            except Exception:
                pass
    return stats

def update_cached_match_stats():
    global cached_match_stats
    try:
        stats = get_match_stats()
        with cached_match_stats_lock:
            cached_match_stats = stats
        print(f"[INFO] Cached match stats updated for {len(stats)} players")
    except Exception as e:
        print("Erro ao atualizar cached_match_stats:", e)

def rename_player_data(old_name, new_name):
    old_clean = clean_name(old_name)
    new_clean = clean_name(new_name)
    if not old_clean or not new_clean or old_clean == new_clean:
        return False

    with stats_lock:
        for period in ["all", "daily"]:
            stats = global_stats.get(period, {})
            for key in ["kills", "deaths", "hits", "headshots", "triple_kills", "max_streak", "hit_locations"]:
                if key in stats and old_clean in stats[key]:
                    stats[key][new_clean] = stats[key].pop(old_clean)
            
            if "weapons" in stats and old_clean in stats["weapons"]:
                stats["weapons"][new_clean] = stats["weapons"].pop(old_clean)
            
            if "relationships" in stats:
                if old_clean in stats["relationships"]:
                    stats["relationships"][new_clean] = stats["relationships"].pop(old_clean)
                for p in stats["relationships"]:
                    if old_clean in stats["relationships"][p]:
                        stats["relationships"][p][new_clean] = stats["relationships"][p].pop(old_clean)
        
        save_stats()

    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        c.execute("SELECT name FROM profiles WHERE name = ?", (new_clean,))
        new_exists = c.fetchone()
        
        if new_exists:
            c.execute("SELECT avatar_url, avatar_original_url FROM profiles WHERE name = ?", (old_clean,))
            old_profile = c.fetchone()
            if old_profile and old_profile[0]:
                c.execute("UPDATE profiles SET avatar_url = ?, avatar_original_url = ? WHERE name = ?", 
                          (old_profile[0], old_profile[1], new_clean))
            c.execute("DELETE FROM profiles WHERE name = ?", (old_clean,))
        else:
            c.execute("UPDATE profiles SET name = ? WHERE name = ?", (new_clean, old_clean))
            
        c.execute("UPDATE matches SET mvp = ? WHERE mvp = ?", (new_clean, old_clean))
        c.execute("UPDATE matches SET mvp = ? WHERE mvp = ?", (old_name, old_clean))
        
        c.execute("SELECT id, scoreboard FROM matches WHERE scoreboard LIKE ?", (f'%"{old_clean}"%',))
        matches_to_update = c.fetchall()
        c.execute("SELECT id, scoreboard FROM matches WHERE scoreboard LIKE ?", (f'%"{old_name}"%',))
        matches_to_update_raw = c.fetchall()
        
        all_matches = set(matches_to_update + matches_to_update_raw)
        
        for mid, sb_json in all_matches:
            if sb_json:
                try:
                    sb = json.loads(sb_json)
                    updated = False
                    for item in sb:
                        if item.get("player") == old_name or clean_name(item.get("player")) == old_clean:
                            item["player"] = new_clean
                            updated = True
                    if updated:
                        c.execute("UPDATE matches SET scoreboard = ? WHERE id = ?", (json.dumps(sb), mid))
                except Exception as ex:
                    print("Erro ao atualizar scoreboard de partida:", ex)
                    
        conn.commit()
        conn.close()
    except Exception as e:
        print("Erro ao renomear jogador no banco de dados:", e)
        return False
        
    update_cached_match_stats()
    return True
