from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import re
import socket
import subprocess
import threading
import time
import sqlite3
import base64
import random
import hashlib
import uuid
from datetime import datetime
from urllib.parse import urlparse, parse_qs, unquote

HOST = "0.0.0.0"
PORT = 8085
BASE_DIR = "/var/www/html/urban"
VOTES_FILE = os.path.join(BASE_DIR, "votes.json")
GAMES_LOG = "/home/lucas/urbanterror43/q3ut4/games.log"
STATS_FILE = os.path.join(BASE_DIR, "kills_stats.json")
DB_FILE = "/var/www/html/urban/urban.db"
AVATARS_DIR = "/var/www/html/urban/avatars"
INITIAL_PARSE_DONE = False

if not os.path.exists(AVATARS_DIR):
    os.makedirs(AVATARS_DIR)

def clean_name(name):
    """Remove códigos de cores do Urban Terror (^1, ^2, etc)"""
    if not name: return ""
    return re.sub(r'\^\d', '', name)

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS profiles
                 (name TEXT PRIMARY KEY, avatar_url TEXT, auth_code TEXT, auth_expiry DATETIME, avatar_original_url TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS matches
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, map TEXT, date TEXT, mvp TEXT, kills INTEGER, scoreboard TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY, password_hash TEXT, player_name TEXT, session_token TEXT, 
                  aim_highscore INTEGER DEFAULT 0, reaction_highscore INTEGER DEFAULT 0, 
                  spray_highscore INTEGER DEFAULT 0, fof_highscore INTEGER DEFAULT 0,
                  grenade_highscore INTEGER DEFAULT 0)''')
    try:
        c.execute("ALTER TABLE matches ADD COLUMN duration REAL DEFAULT 0.0;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN aim_highscore INTEGER DEFAULT 0;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN reaction_highscore INTEGER DEFAULT 0;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN spray_highscore INTEGER DEFAULT 0;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN fof_highscore INTEGER DEFAULT 0;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN grenade_highscore INTEGER DEFAULT 0;")
    except Exception:
        pass
    conn.commit()
    conn.close()

init_db()

# ── Password Hashing Helpers ──

def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${pwd_hash}"

def verify_password(stored_hash, password):
    try:
        salt, pwd_hash = stored_hash.split('$')
        comp_hash = hash_password(password, salt)
        return comp_hash == stored_hash
    except Exception:
        return False

def get_player_avatar(name):
    try:
        clean = clean_name(name)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT avatar_url FROM profiles WHERE name = ?", (clean,))
        res = c.fetchone()
        conn.close()
        return res[0] if res else None
    except:
        return None

def get_player_avatars(name):
    try:
        clean = clean_name(name)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT avatar_url, avatar_original_url FROM profiles WHERE name = ?", (clean,))
        res = c.fetchone()
        conn.close()
        if res:
            return res[0], res[1]
        return None, None
    except:
        return None, None

def set_auth_code(name, code):
    clean = clean_name(name)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    expiry = datetime.now().timestamp() + 600
    # Usa INSERT OR REPLACE mas preserva avatar_url se já existir
    c.execute("""
        INSERT INTO profiles (name, auth_code, auth_expiry) 
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET 
            auth_code = excluded.auth_code,
            auth_expiry = excluded.auth_expiry
    """, (clean, code, expiry))
    conn.commit()
    conn.close()

def verify_auth_code(name, code):
    clean = clean_name(name)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT auth_code FROM profiles WHERE name = ?", (clean,))
    res = c.fetchone()
    conn.close()
    
    print(f"[DEBUG] Auth attempt: name='{name}', clean='{clean}', code='{code}'")
    if res:
        saved_code = res[0]
        print(f"[DEBUG] DB record: saved_code='{saved_code}'")
        if str(saved_code) == str(code):
            return True
        else:
            print(f"[DEBUG] Validation failed: code mismatch")
    else:
        print(f"[DEBUG] No record found for '{clean}'")
    return False

def save_avatar(name, b64_cropped, b64_original=None):
    if not b64_cropped: return None
    try:
        clean = clean_name(name)
        
        # Save cropped image
        header, data = b64_cropped.split(",", 1)
        ext = "jpg"
        if "png" in header: ext = "png"
        elif "webp" in header: ext = "webp"
        
        timestamp = int(time.time())
        filename = f"{clean.replace(' ', '_')}_{timestamp}.{ext}"
        filepath = os.path.join(AVATARS_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(data))
        
        url = f"avatars/{filename}"
        
        # Save original image
        original_url = None
        if b64_original:
            orig_header, orig_data = b64_original.split(",", 1)
            orig_ext = "jpg"
            if "png" in orig_header: orig_ext = "png"
            elif "webp" in orig_header: orig_ext = "webp"
            
            orig_filename = f"{clean.replace(' ', '_')}_{timestamp}_orig.{orig_ext}"
            orig_filepath = os.path.join(AVATARS_DIR, orig_filename)
            
            with open(orig_filepath, "wb") as f:
                f.write(base64.b64decode(orig_data))
            
            original_url = f"avatars/{orig_filename}"
            
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Query old avatar files to delete them afterwards
        c.execute("SELECT avatar_url, avatar_original_url FROM profiles WHERE name = ?", (clean,))
        old_res = c.fetchone()
        
        # Ensure a record for name always exists
        c.execute("INSERT OR IGNORE INTO profiles (name) VALUES (?)", (clean,))
        
        if original_url:
            c.execute("UPDATE profiles SET avatar_url = ?, avatar_original_url = ? WHERE name = ?", (url, original_url, clean))
        else:
            c.execute("UPDATE profiles SET avatar_url = ? WHERE name = ?", (url, clean))
        conn.commit()
        conn.close()
        
        # Exclude/delete old avatar files if they exist
        if old_res:
            old_avatar, old_orig = old_res
            if old_avatar and old_avatar.startswith("avatars/"):
                old_path = os.path.join(AVATARS_DIR, os.path.basename(old_avatar))
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                        print(f"[DEBUG] Deleted old avatar: {old_path}")
                    except Exception as ex:
                        print("Erro ao excluir avatar antigo:", ex)
            if old_orig and old_orig.startswith("avatars/"):
                old_orig_path = os.path.join(AVATARS_DIR, os.path.basename(old_orig))
                if os.path.exists(old_orig_path):
                    try:
                        os.remove(old_orig_path)
                        print(f"[DEBUG] Deleted old original avatar: {old_orig_path}")
                    except Exception as ex:
                        print("Erro ao excluir avatar original antigo:", ex)
        return url
    except Exception as e:
        print("Erro ao salvar avatar:", e)
        return None

stats_lock = threading.Lock()
global_stats = {}

KILL_RE = re.compile(r"Kill: \d+ \d+ \d+: (.+?) killed (.+?) by (\S+)$")
INIT_RE = re.compile(r"InitGame: (.*)$")
BEGIN_RE = re.compile(r"ClientBegin: (\d+)$")

current_weapons_msg = "^2Armas: ^7Todas liberadas"
current_map_name = ""

WEAPONS_MAP = {
    "F": "Beretta", "G": "DEagle", "f": "Glock", "g": "Colt1911", "l": "Magnum",
    "I": "MP5K", "J": "UMP45", "h": "MAC11", "k": "P90", "c": "Negev",
    "L": "LR300", "M": "G36", "a": "AK103", "e": "M4A1",
    "N": "PSG-1", "Z": "SR8", "i": "FRF1",
    "H": "SPAS12", "j": "Benelli", "K": "HK69",
    "O": "HE-Gren", "Q": "Smoke"
}
OFFICIAL_GEAR_SEQUENCE = "FGHIJKLMNZacefghijklOQRSTUVWX"

def decode_gear(gear_str):
    gear_str = gear_str.replace('"', '').strip()
    if gear_str == "0" or not gear_str:
        return "Todas liberadas"
    
    allowed = []
    for letter in OFFICIAL_GEAR_SEQUENCE:
        if letter not in gear_str and letter in WEAPONS_MAP:
            allowed.append(letter)
            
    profiles = {
        "Somente Pistola": set("FGfgl"),
        "Somente Sniper": set("NZi"),
        "Somente Shotgun": set("Hj"),
        "Somente Granada": set("KOQ"),
        "Somente Faca/Kevlar": set("")
    }
    
    allowed_set = set(allowed)
    for name, p_set in profiles.items():
        if allowed_set == p_set:
            return name
            
    if not allowed:
        return "Somente Faca/Kevlar"
    
    allowed_names = [WEAPONS_MAP[l] for l in allowed]
    
    if len(allowed_names) > 8:
        return "Quase todas (veja menu)"
        
    return ", ".join(allowed_names)

def get_default_limits():
    timelimit = 5
    fraglimit = 10
    cfg_path = "/home/lucas/Documentos/urbanterror43/q3ut4/server.cfg"
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                content = f.read()
            m_time = re.search(r'(?m)^(\s*set\s+)?timelimit\s+"?(\d+)"?', content)
            m_frag = re.search(r'(?m)^(\s*set\s+)?fraglimit\s+"?(\d+)"?', content)
            if m_time:
                timelimit = int(m_time.group(2))
            if m_frag:
                fraglimit = int(m_frag.group(2))
        except Exception as e:
            print("Erro ao ler limites do server.cfg:", e)
    return timelimit, fraglimit

def send_rcon(command):
    if not INITIAL_PARSE_DONE:
        return
    password = "coco"
    ip = "127.0.0.1"
    port = 27960
    prefix = b'\xff\xff\xff\xff'
    payload = f"rcon {password} {command}".encode('utf-8')
    packet = prefix + payload
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(0.5)
            sock.sendto(packet, (ip, port))
    except Exception:
        pass

def send_rcon_sync(command):
    if not INITIAL_PARSE_DONE:
        return ""
    password = "coco"
    ip = "127.0.0.1"
    port = 27960
    prefix = b'\xff\xff\xff\xff'
    payload = f"rcon {password} {command}".encode('utf-8')
    packet = prefix + payload
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(1.0)
            sock.sendto(packet, (ip, port))
            data, _ = sock.recvfrom(4096)
            return data.decode('utf-8', errors='replace').replace('\xff\xff\xff\xffprint\n', '')
    except Exception:
        return ""


def load_stats():
    global global_stats
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, "r") as f:
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
        conn = sqlite3.connect(DB_FILE)
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
            print("[INFO] Historico migrado para o banco de dados e limpo do global_stats")
        conn.close()
    except Exception as e:
        print("Erro na migracao de historico para o BD:", e)

cached_match_stats = {}
cached_match_stats_lock = threading.Lock()

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

def get_player_best_map(player_name):
    player_clean = clean_name(player_name)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT map, scoreboard FROM matches")
    rows = c.fetchall()
    conn.close()
    
    map_kills = {}
    for map_name, scoreboard_json in rows:
        if not scoreboard_json:
            continue
        try:
            sb = json.loads(scoreboard_json)
            for entry in sb:
                if clean_name(entry["player"]) == player_clean:
                    map_kills[map_name] = map_kills.get(map_name, 0) + entry.get("kills", 0)
        except Exception:
            pass
    if not map_kills:
        return "Nenhum"
    return max(map_kills, key=map_kills.get)

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

    # 1. Update global_stats in memory & file
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

    # 2. Update profiles and matches tables in SQLite
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

def int_to_roman(num):
    if num <= 0:
        return ""
    val = [
        1000, 900, 500, 400,
        100, 90, 50, 40,
        10, 9, 5, 4,
        1
    ]
    syb = [
        "M", "CM", "D", "CD",
        "C", "XC", "L", "XL",
        "X", "IX", "V", "IV",
        "I"
    ]
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syb[i]
            num -= val[i]
        i += 1
    return roman_num

def calc_infinite_achievement(value, base):
    import math
    if base <= 0:
        return {"unlocked": False, "level": 0, "roman": "", "current": value, "target": base}
    if value < base:
        return {
            "unlocked": False,
            "level": 0,
            "roman": "",
            "current": value,
            "target": base
        }
    level = 1 + int(math.log2(value / base))
    next_target = base * (2 ** level)
    return {
        "unlocked": True,
        "level": level,
        "roman": int_to_roman(level),
        "current": value,
        "target": next_target
    }

def check_achievements(player, stats_all, player_match_stats):
    import math
    baselines = global_stats.get("baselines", {}).get(player, {})
    
    kills = max(0, stats_all.get("kills", {}).get(player, 0) - baselines.get("kills", 0))
    deaths = max(0, stats_all.get("deaths", {}).get(player, 0) - baselines.get("deaths", 0))
    kd = kills / deaths if deaths > 0 else kills
    
    weapons = stats_all.get("weapons", {}).get(player, {})
    b_sniper = baselines.get("sniper_kills", 0)
    b_pistol = baselines.get("pistol_kills", 0)
    b_auto = baselines.get("auto_kills", 0)
    b_shotgun = baselines.get("shotgun_kills", 0)
    b_grenade = baselines.get("grenade_kills", 0)
    b_knife = baselines.get("knife_kills", 0)
    b_knife_thrown = baselines.get("knife_thrown_kills", 0)
    
    sniper_kills = max(0, weapons.get("UT_MOD_PSG1", 0) + weapons.get("UT_MOD_SR8", 0) + weapons.get("UT_MOD_FRF1", 0) - b_sniper)
    pistol_kills = max(0, (weapons.get("UT_MOD_BERETTA", 0) + weapons.get("UT_MOD_DEAGLE", 0) + 
                          weapons.get("UT_MOD_GLOCK", 0) + weapons.get("UT_MOD_COLT1911", 0) + 
                          weapons.get("UT_MOD_MAGNUM", 0)) - b_pistol)
    auto_kills = max(0, (weapons.get("UT_MOD_AK103", 0) + weapons.get("UT_MOD_LR300", 0) + 
                        weapons.get("UT_MOD_G36", 0) + weapons.get("UT_MOD_M4", 0) + 
                        weapons.get("UT_MOD_NEGEV", 0) + weapons.get("UT_MOD_MP5K", 0) + 
                        weapons.get("UT_MOD_UMP45", 0) + weapons.get("UT_MOD_MAC11", 0) + 
                        weapons.get("UT_MOD_P90", 0)) - b_auto)
    shotgun_kills = max(0, weapons.get("UT_MOD_SPAS", 0) + weapons.get("UT_MOD_BENELLI", 0) - b_shotgun)
    grenade_kills = max(0, weapons.get("UT_MOD_HEGRENADE", 0) + weapons.get("UT_MOD_HK69", 0) + weapons.get("UT_MOD_HK69_HIT", 0) - b_grenade)
    knife_kills = max(0, weapons.get("UT_MOD_KNIFE", 0) + weapons.get("UT_MOD_KNIFE_THROWN", 0) + weapons.get("UT_MOD_BLED", 0) - b_knife)
    knife_thrown_kills = max(0, weapons.get("UT_MOD_KNIFE_THROWN", 0) - b_knife_thrown)
    
    relationships = stats_all.get("relationships", {}).get(player, {})
    max_kills_single_victim = max(relationships.values()) if relationships else 0
    max_kills_single_victim = max(0, max_kills_single_victim - baselines.get("max_kills_single_victim", 0))
    victim_collector_val = max(0, len(relationships) - baselines.get("relationships_count", 0))
    
    matches_played = max(0, player_match_stats.get("matches", 0) - baselines.get("matches", 0))
    mvps = max(0, player_match_stats.get("mvps", 0) - baselines.get("mvps", 0))
    max_kills_in_match = max(0, player_match_stats.get("max_kills", 0) - baselines.get("max_kills_in_match", 0))
    
    triple_kills = max(0, stats_all.get("triple_kills", {}).get(player, 0) - baselines.get("triple_kills", 0))
    max_streak = max(0, stats_all.get("max_streak", {}).get(player, 0) - baselines.get("max_streak", 0))
    hits = max(0, stats_all.get("hits", {}).get(player, 0) - baselines.get("hits", 0))
    headshots = max(0, stats_all.get("headshots", {}).get(player, 0) - baselines.get("headshots", 0))
    hs_ratio = (headshots / hits) * 100.0 if hits >= 50 else 0.0
    
    # HS Ratio custom achievements logic
    if hits < 50 or hs_ratio < 20.0:
        hs_ach = {"unlocked": False, "level": 0, "roman": "", "current": round(hs_ratio, 1), "target": 20.0}
    else:
        hs_lvl = min(int((hs_ratio - 20) / 10) + 1, 9)
        hs_ach = {
            "unlocked": True,
            "level": hs_lvl,
            "roman": int_to_roman(hs_lvl),
            "current": round(hs_ratio, 1),
            "target": min(20.0 + hs_lvl * 10.0, 100.0)
        }
        
    # K/D Elite custom achievements logic
    if kills < 100 or kd < 1.5:
        kd_ach = {"unlocked": False, "level": 0, "roman": "", "current": round(kd, 2) if kills >= 100 else 0, "target": 1.5}
    else:
        kd_lvl = 1 + int(math.log2(kd / 1.5))
        kd_ach = {
            "unlocked": True,
            "level": kd_lvl,
            "roman": int_to_roman(kd_lvl),
            "current": round(kd, 2),
            "target": round(1.5 * (2 ** kd_lvl), 2)
        }

    achievements = {
        "kills": calc_infinite_achievement(kills, 100),
        "deaths": calc_infinite_achievement(deaths, 100),
        "matches": calc_infinite_achievement(matches_played, 10),
        "mvp": calc_infinite_achievement(mvps, 5),
        "triple_kills": calc_infinite_achievement(triple_kills, 5),
        "max_streak": calc_infinite_achievement(max_streak, 5),
        "headshots": calc_infinite_achievement(headshots, 25),
        "hs_ratio": hs_ach,
        "weapon_sniper": calc_infinite_achievement(sniper_kills, 100),
        "weapon_pistol": calc_infinite_achievement(pistol_kills, 100),
        "weapon_auto": calc_infinite_achievement(auto_kills, 100),
        "weapon_shotgun": calc_infinite_achievement(shotgun_kills, 50),
        "weapon_grenade": calc_infinite_achievement(grenade_kills, 20),
        "weapon_knife": calc_infinite_achievement(knife_kills, 20),
        "knife_thrown": calc_infinite_achievement(knife_thrown_kills, 1),
        "kd_elite": kd_ach,
        "unbeatable": calc_infinite_achievement(max_kills_in_match, 30),
        "nemesis_hunter": calc_infinite_achievement(max_kills_single_victim, 100),
        "victim_collector": calc_infinite_achievement(victim_collector_val, 5)
    }

    # Calculate completionist
    other_lvls = [ach["level"] for ach in achievements.values()]
    min_lvl = min(other_lvls) if other_lvls else 0
    if min_lvl == 0:
        completionist_ach = {
            "unlocked": False,
            "level": 0,
            "roman": "",
            "current": 0,
            "target": 1
        }
    else:
        completionist_ach = {
            "unlocked": True,
            "level": min_lvl,
            "roman": int_to_roman(min_lvl),
            "current": min_lvl,
            "target": min_lvl + 1
        }

    achievements["completionist"] = completionist_ach
    return achievements

def get_achievements_levels(all_players, stats_all, cached_stats):
    player_levels = {}
    for player in all_players:
        player_clean = clean_name(player)
        player_m_stats = cached_stats.get(player_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
        ach_results = check_achievements(player_clean, stats_all, player_m_stats)
        player_levels[player_clean] = {ach_id: info["level"] for ach_id, info in ach_results.items()}
    return player_levels

ACHIEVEMENTS_NAMES = {
    "kills": "Exterminador",
    "deaths": "Saco de Pancadas",
    "matches": "Veterano",
    "mvp": "Destaque",
    "triple_kills": "Multi-kill",
    "max_streak": "Imbatível",
    "headshots": "Atirador de Elite",
    "hs_ratio": "Mira Perfeita",
    "weapon_sniper": "Olho de Águia",
    "weapon_pistol": "Pistoleiro",
    "weapon_auto": "Rambo",
    "weapon_shotgun": "Impacto Próximo",
    "weapon_grenade": "Mestre da Explosão",
    "weapon_knife": "Assassino Furtivo",
    "knife_thrown": "Cirúrgico",
    "kd_elite": "Soldado de Elite",
    "unbeatable": "Massacre",
    "nemesis_hunter": "Caçador de Nêmesis",
    "victim_collector": "Colecionador de Almas",
    "completionist": "Perfeccionista"
}

def update_and_check_achievement(player, update_fn):
    player_clean = clean_name(player)
    with cached_match_stats_lock:
        p_m_stats = cached_match_stats.get(player_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
    
    # Check stats before update
    ach_before = check_achievements(player_clean, global_stats["all"], p_m_stats)
    
    # Run update function
    update_fn()
    
    # Check stats after update
    ach_after = check_achievements(player_clean, global_stats["all"], p_m_stats)
    
    # Compare levels
    for ach_id, info_after in ach_after.items():
        info_before = ach_before.get(ach_id, {"level": 0})
        if info_after["level"] > info_before["level"]:
            lvl = info_after["level"]
            roman = info_after["roman"]
            
            # Compute rarity
            all_players = set(global_stats["all"].get("kills", {}).keys()) | set(global_stats["all"].get("deaths", {}).keys())
            player_levels = get_achievements_levels(all_players, global_stats["all"], cached_match_stats)
            count = sum(1 for p in player_levels.values() if p.get(ach_id, 0) >= lvl)
            pct = round((count / len(all_players)) * 100, 1) if all_players else 100.0
            
            if pct < 5.0:
                color = "^3"
                rarity_name = "Lendaria"
            elif pct < 20.0:
                color = "^6"
                rarity_name = "Epica"
            elif pct < 50.0:
                color = "^5"
                rarity_name = "Rara"
            else:
                color = "^7"
                rarity_name = "Comum"
                
            ach_name = ACHIEVEMENTS_NAMES.get(ach_id, ach_id)
            msg = f'say "^2{player} ^7conquistou {color}{ach_name} {roman} ^7({pct}% - {rarity_name})"'
            send_rcon(msg)

def parse_logs_worker():
    current_match_stats = {}
    current_streaks = {}
    last_line_time = 0.0
    while True:
        try:
            with stats_lock:
                today_str = datetime.now().strftime("%Y-%m-%d")
                if global_stats["daily_date"] != today_str:
                    # Só rotaciona se o arquivo existir e o parser já tiver lido tudo até o fim
                    if os.path.exists(GAMES_LOG):
                        current_size = os.path.getsize(GAMES_LOG)
                        if global_stats["offset"] >= current_size:
                            try:
                                with open(GAMES_LOG, "w") as f:
                                    f.truncate(0)
                                global_stats["offset"] = 0
                                global_stats["daily_date"] = today_str
                                global_stats["daily"] = {
                                    "kills": {}, "deaths": {}, "weapons": {}, "relationships": {},
                                    "hits": {}, "headshots": {}, "triple_kills": {}, "max_streak": {},
                                    "hit_locations": {}
                                }
                                save_stats()
                                print(f"[INFO] games.log truncado e rotacionado para o novo dia: {today_str}")
                            except Exception as e:
                                print("Erro ao truncar games.log:", e)
                    else:
                        global_stats["daily_date"] = today_str
                        global_stats["daily"] = {
                            "kills": {}, "deaths": {}, "weapons": {}, "relationships": {},
                            "hits": {}, "headshots": {}, "triple_kills": {}, "max_streak": {},
                            "hit_locations": {}
                        }
                        save_stats()
            
            if os.path.exists(GAMES_LOG):
                current_size = os.path.getsize(GAMES_LOG)
                with stats_lock:
                    if current_size < global_stats["offset"]:
                        global_stats["offset"] = 0
                
                with open(GAMES_LOG, "rb") as f:
                    with stats_lock:
                        f.seek(global_stats["offset"])
                        new_data = False
                        for raw in f:
                            new_data = True
                            line = raw.decode("utf-8", errors="replace")
                            
                            # Extract line timestamp
                            m_time = re.match(r"^\s*(\d+):(\d+)", line)
                            if m_time:
                                last_line_time = int(m_time.group(1)) + int(m_time.group(2)) / 60.0
                            
                            m_init = INIT_RE.search(line)
                            if m_init:
                                params_str = m_init.group(1)
                                parts = params_str.split('\\')
                                params = {}
                                for i in range(1, len(parts)-1, 2):
                                    params[parts[i]] = parts[i+1]
                                
                                mapname = params.get('mapname', 'desconhecido').strip()
                                gear = params.get('g_gear', '0').strip()
                                weapons_text = decode_gear(gear)
                                current_match_stats = {}
                                last_line_time = 0.0
                                
                                msg = f"^2Armas: ^7{weapons_text}"
                                with open("bot_debug.log", "a") as dbg:
                                    dbg.write(f"[{datetime.now()}] InitGame: {mapname} | Gear: {gear} | Decoded: {weapons_text}\n")
                                
                                global current_weapons_msg, current_map_name
                                current_weapons_msg = msg
                                current_map_name = mapname
                                
                                # Envia via rcon após um delay para garantir que o server carregou
                                def broadcast(m, m_name):
                                    time.sleep(10) # Espera 10 segundos para garantir carregamento
                                    if current_map_name != m_name:
                                        return
                                        
                                    for _ in range(5):
                                        if current_map_name != m_name:
                                            break
                                        send_rcon(f'bigtext "{m}"')
                                        send_rcon(f'say "{m}"')
                                        time.sleep(4)
                                
                                threading.Thread(target=broadcast, args=(msg, mapname), daemon=True).start()
                                continue

                            m_begin = BEGIN_RE.search(line)
                            if m_begin:
                                slot = m_begin.group(1)
                                with open("bot_debug.log", "a") as dbg:
                                    dbg.write(f"[{datetime.now()}] ClientBegin: {slot}\n")
                                    
                                def welcome(s):
                                    time.sleep(3)
                                    for _ in range(3):
                                        # Envia mensagem privada apenas para o jogador que entrou
                                        send_rcon(f'tell {s} "{current_weapons_msg}"')
                                        time.sleep(3)
                                threading.Thread(target=welcome, args=(slot,), daemon=True).start()
                                continue

                            # Detect chat commands: say: ID Name: text
                            m_chat = re.search(r"say:\s+(\d+)\s+(.*?):\s+(!\w+)", line)
                            if m_chat:
                                pid, pname, cmd = m_chat.group(1), m_chat.group(2), m_chat.group(3)
                                if cmd == "!perfil" or cmd == "!auth" or cmd == "!foto":
                                    code = str(random.randint(1000, 9999))
                                    set_auth_code(pname, code)
                                    send_rcon_sync(f'tell {pid} "^2[SITE] ^7Seu codigo: ^3{code} ^7(Expira em 10 min)"')
                                continue

                            m_shutdown = re.search(r"ShutdownGame:|Exit:", line)
                            if m_shutdown:
                                # Finalize active streaks
                                for p, p_streak in current_streaks.items():
                                    if p_streak > 0:
                                        for period in ["all", "daily"]:
                                            stats = global_stats[period]
                                            stats["max_streak"][p] = max(stats["max_streak"].get(p, 0), p_streak)
                                current_streaks = {}

                                if current_map_name and current_match_stats:
                                    mvp = "Ninguém"
                                    mvp_kills = 0
                                    for p, p_stats in current_match_stats.items():
                                        if p_stats["kills"] > mvp_kills:
                                            mvp = p
                                            mvp_kills = p_stats["kills"]
                                    
                                    # Format scoreboard
                                    scoreboard_data = []
                                    for p, p_stats in current_match_stats.items():
                                        scoreboard_data.append({
                                            "player": p,
                                            "kills": p_stats["kills"],
                                            "deaths": p_stats["deaths"]
                                        })
                                    scoreboard_data.sort(key=lambda x: (-x["kills"], x["deaths"]))

                                    # Capture achievements level before database update
                                    ach_before = {}
                                    with cached_match_stats_lock:
                                        for p in current_match_stats.keys():
                                            p_clean = clean_name(p)
                                            p_m_stats = cached_match_stats.get(p_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
                                            ach_before[p_clean] = check_achievements(p_clean, global_stats["all"], p_m_stats)
                                    
                                    try:
                                        conn = sqlite3.connect(DB_FILE)
                                        c = conn.cursor()
                                        c.execute("INSERT INTO matches (map, date, mvp, kills, scoreboard, duration) VALUES (?, ?, ?, ?, ?, ?)",
                                                  (current_map_name, datetime.now().strftime("%Y-%m-%d %H:%M"), mvp, mvp_kills, json.dumps(scoreboard_data), last_line_time))
                                        conn.commit()
                                        conn.close()
                                        update_cached_match_stats()
                                    except Exception as e:
                                        print("Erro ao salvar partida no BD:", e)

                                    # Compare achievements level after database update and announce
                                    with cached_match_stats_lock:
                                        for p in current_match_stats.keys():
                                            p_clean = clean_name(p)
                                            p_m_stats = cached_match_stats.get(p_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
                                            ach_after = check_achievements(p_clean, global_stats["all"], p_m_stats)
                                            
                                            for ach_id, info_after in ach_after.items():
                                                info_before = ach_before.get(p_clean, {}).get(ach_id, {"level": 0})
                                                if info_after["level"] > info_before["level"]:
                                                    lvl = info_after["level"]
                                                    roman = info_after["roman"]
                                                    
                                                    # Compute rarity
                                                    all_players = set(global_stats["all"].get("kills", {}).keys()) | set(global_stats["all"].get("deaths", {}).keys())
                                                    player_levels = get_achievements_levels(all_players, global_stats["all"], cached_match_stats)
                                                    count = sum(1 for pl in player_levels.values() if pl.get(ach_id, 0) >= lvl)
                                                    pct = round((count / len(all_players)) * 100, 1) if all_players else 100.0
                                                    
                                                    if pct < 5.0:
                                                        color = "^3"
                                                        rarity_name = "Lendaria"
                                                    elif pct < 20.0:
                                                        color = "^6"
                                                        rarity_name = "Epica"
                                                    elif pct < 50.0:
                                                        color = "^5"
                                                        rarity_name = "Rara"
                                                    else:
                                                        color = "^7"
                                                        rarity_name = "Comum"
                                                        
                                                    ach_name = ACHIEVEMENTS_NAMES.get(ach_id, ach_id)
                                                    msg = f'say "^2{p} ^7conquistou {color}{ach_name} {roman} ^7({pct}% - {rarity_name})"'
                                                    send_rcon(msg)
                                current_match_stats = {}
                                continue

                            # Detect hits (text format: "X hit Y in the Z")
                            m_hit = re.search(r"Hit:\s+\d+\s+\d+\s+\d+\s+\d+:\s+(.+?)\s+hit\s+(.+?)\s+in\s+the\s+(\w+)", line)
                            if m_hit:
                                attacker = m_hit.group(1)
                                location_raw = m_hit.group(3).lower()
                                # Normalize location to canonical body zone
                                if location_raw in ("head", "helmet"):
                                    zone = "head"
                                elif location_raw in ("torso", "vest", "chest"):
                                    zone = "torso"
                                elif location_raw in ("arm", "arms", "leftarm", "rightarm", "left_arm", "right_arm"):
                                    zone = "arms"
                                elif location_raw in ("groin", "butt", "gluteus"):
                                    zone = "groin"
                                elif location_raw in ("leg", "legs", "leftleg", "rightleg", "left_leg", "right_leg", "foot", "feet"):
                                    zone = "legs"
                                else:
                                    zone = "torso"  # fallback
                                def do_hit_update(a=attacker, z=zone):
                                    for period in ["all", "daily"]:
                                        stats = global_stats[period]
                                        stats["hits"][a] = stats["hits"].get(a, 0) + 1
                                        if z == "head":
                                            stats["headshots"][a] = stats["headshots"].get(a, 0) + 1
                                        # Track hit location per player
                                        if a not in stats["hit_locations"]:
                                            stats["hit_locations"][a] = {"head": 0, "torso": 0, "arms": 0, "groin": 0, "legs": 0}
                                        stats["hit_locations"][a][z] = stats["hit_locations"][a].get(z, 0) + 1
                                update_and_check_achievement(attacker, do_hit_update)
                                continue

                            # Detect hits (numeric format: "Hit: aid vid loc weapon")
                            m_hit_num = re.search(r"^\s*Hit:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", line)
                            if m_hit_num:
                                # We only have IDs here - need ClientUserinfoChanged mapping
                                # Skip numeric-only hits without name resolution for now
                                pass

                            m = KILL_RE.search(line)
                            if not m:
                                continue
                            killer, victim, weapon = m.group(1), m.group(2), m.group(3)
                            
                            # Update killstreaks & stats
                            victim_streak = current_streaks.get(victim, 0)
                            
                            def do_victim_update():
                                if victim_streak > 0:
                                    for period in ["all", "daily"]:
                                        stats = global_stats[period]
                                        stats["max_streak"][victim] = max(stats["max_streak"].get(victim, 0), victim_streak)
                                current_streaks[victim] = 0
                                
                                for period in ["all", "daily"]:
                                    stats = global_stats[period]
                                    stats["deaths"][victim] = stats["deaths"].get(victim, 0) + 1
                            
                            update_and_check_achievement(victim, do_victim_update)
                            
                            if killer != victim and killer != "<world>":
                                def do_killer_update():
                                    for period in ["all", "daily"]:
                                        stats = global_stats[period]
                                        stats["kills"][killer] = stats["kills"].get(killer, 0) + 1
                                        if killer not in stats["weapons"]:
                                            stats["weapons"][killer] = {}
                                        stats["weapons"][killer][weapon] = stats["weapons"][killer].get(weapon, 0) + 1
                                        
                                        if killer not in stats["relationships"]:
                                            stats["relationships"][killer] = {}
                                        stats["relationships"][killer][victim] = stats["relationships"][killer].get(victim, 0) + 1
                                    
                                    current_streaks[killer] = current_streaks.get(killer, 0) + 1
                                    if current_streaks[killer] % 3 == 0:
                                        for period in ["all", "daily"]:
                                            stats = global_stats[period]
                                            stats["triple_kills"][killer] = stats["triple_kills"].get(killer, 0) + 1
                                
                                update_and_check_achievement(killer, do_killer_update)
                            
                            if victim not in current_match_stats:
                                current_match_stats[victim] = {"kills": 0, "deaths": 0}
                            current_match_stats[victim]["deaths"] += 1
                            
                            if killer != victim and killer != "<world>":
                                if killer not in current_match_stats:
                                    current_match_stats[killer] = {"kills": 0, "deaths": 0}
                                current_match_stats[killer]["kills"] += 1
                        
                        if new_data:
                            global_stats["offset"] = f.tell()
                            save_stats()
                
                global INITIAL_PARSE_DONE
                INITIAL_PARSE_DONE = True
        except Exception as e:
            print("Erro no log parser:", e)
        time.sleep(5)


def load_votes():
    if not os.path.exists(VOTES_FILE):
        return []
    with open(VOTES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_votes(votes):
    with open(VOTES_FILE, "w", encoding="utf-8") as f:
        json.dump(votes, f, indent=4, ensure_ascii=False)


def today():
    return datetime.now().strftime("%Y-%m-%d")


class VoteServer(SimpleHTTPRequestHandler):
    def end_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_cors()
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/kills":
            period = parse_qs(parsed.query).get("period", ["all"])[0]
            
            with stats_lock:
                stats_to_use = global_stats.get(period, global_stats["all"])
                players = set(stats_to_use["kills"]) | set(stats_to_use["deaths"])
                
                # Inclui jogadores com contas cadastradas mesmo que nao estejam nos logs de kills/deaths
                try:
                    conn = sqlite3.connect(DB_FILE)
                    c = conn.cursor()
                    c.execute("SELECT DISTINCT COALESCE(player_name, username) FROM users WHERE COALESCE(player_name, username) IS NOT NULL AND COALESCE(player_name, username) != ''")
                    for row in c.fetchall():
                        players.add(row[0])
                    conn.close()
                except Exception as e:
                    print("Erro ao carregar jogadores cadastrados para comparacao:", e)
                
                result = []
                for p in players:
                    k = stats_to_use["kills"].get(p, 0) if "kills" in stats_to_use else 0
                    d = stats_to_use["deaths"].get(p, 0) if "deaths" in stats_to_use else 0
                    top_weapon = ""
                    weapons = stats_to_use["weapons"].get(p, {}) if "weapons" in stats_to_use else {}
                    if weapons:
                        top_weapon = max(weapons, key=weapons.get).replace("UT_MOD_", "")
                    
                    avatar_url, avatar_orig = get_player_avatars(p)
                    result.append({
                        "player": p, 
                        "kills": k, 
                        "deaths": d, 
                        "topWeapon": top_weapon,
                        "avatar": avatar_url,
                        "avatar_original": avatar_orig or avatar_url
                    })
                result.sort(key=lambda x: x["kills"], reverse=True)

            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        if self.path == "/votes":
            votes = [v for v in load_votes() if v["date"] == today()]

            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            self.wfile.write(json.dumps(votes).encode("utf-8"))
            return

        if self.path == "/server-status":
            # pgrep sem -f para não casar com o script start.sh
            # Nome do processo truncado no Linux (15 chars): "Quake3-UrT-Ded."
            is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
            
            t_lim, f_lim = get_default_limits()
            
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "running": is_running,
                "default_timelimit": t_lim,
                "default_fraglimit": f_lim
            }).encode("utf-8"))
            return

        if self.path == "/server-live":
            is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
            if not is_running:
                if os.path.exists("mock_live.txt"):
                    try:
                        with open("mock_live.txt", "r") as f:
                            mock_data = json.loads(f.read())
                        # Populate avatars for mock data
                        for p in mock_data.get("players", []):
                            avatar_url, avatar_orig = get_player_avatars(p["name"])
                            p["avatar"] = avatar_url
                            p["avatar_original"] = avatar_orig or avatar_url
                        self.send_response(200)
                        self.end_cors()
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps(mock_data).encode("utf-8"))
                        return
                    except Exception as e:
                        print("Erro ao ler mock_live.txt:", e)
                
                self.send_response(200)
                self.end_cors()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"running": False, "players": [], "map": ""}).encode("utf-8"))
                return
                
            status_text = send_rcon_sync("status")
            players = []
            map_name = ""
            lines = status_text.split('\n')
            for line in lines:
                if line.startswith("map:"):
                    map_name = line.split("map:")[1].strip()
                elif re.match(r'^\s*\d+\s+', line):
                    parts = line.split()
                    if len(parts) >= 4:
                        ping = parts[2]
                        name = parts[3]
                        if name != "^7":
                            # Limpar códigos de cor para o front-end
                            name_clean = re.sub(r'\^\d', '', name)
                            avatar_url, avatar_orig = get_player_avatars(name_clean)
                            players.append({
                                "name": name_clean, 
                                "ping": ping, 
                                "score": parts[1],
                                "avatar": avatar_url,
                                "avatar_original": avatar_orig or avatar_url
                            })
            
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"running": True, "players": players, "map": map_name}).encode("utf-8"))
            return

        if parsed.path == "/profile":
            player_name = parse_qs(parsed.query).get("player", [""])[0]
            with stats_lock:
                stats = global_stats["all"]
                relationships = stats.get("relationships", {})
                
                # Victim favorita: quem ele mais matou
                fav_victim = "Ninguém"
                fav_victim_kills = 0
                if player_name in relationships and relationships[player_name]:
                    fav_victim = max(relationships[player_name], key=relationships[player_name].get)
                    fav_victim_kills = relationships[player_name][fav_victim]
                
                # Nêmesis: quem mais matou ele
                nemesis = "Ninguém"
                nemesis_kills = 0
                for k, victims in relationships.items():
                    if player_name in victims:
                        if victims[player_name] > nemesis_kills:
                            nemesis = k
                            nemesis_kills = victims[player_name]
                
                top_weapon = ""
                weapons = stats.get("weapons", {}).get(player_name, {})
                if weapons:
                    top_weapon = max(weapons, key=weapons.get).replace("UT_MOD_", "")
                    
                # Calculate achievements
                all_players = set(stats.get("kills", {}).keys()) | set(stats.get("deaths", {}).keys())
                with cached_match_stats_lock:
                    match_stats = cached_match_stats
                
                player_levels = get_achievements_levels(all_players, stats, match_stats)
                
                player_clean = clean_name(player_name)
                player_m_stats = match_stats.get(player_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
                player_ach_results = check_achievements(player_clean, stats, player_m_stats)
                
                achievements_data = {}
                total_players = len(all_players)
                for ach_id, ach_info in player_ach_results.items():
                    current_lvl = ach_info["level"]
                    target_lvl = max(1, current_lvl)
                    
                    count_at_least_target = sum(1 for p in player_levels.values() if p.get(ach_id, 0) >= target_lvl)
                    pct = round((count_at_least_target / total_players) * 100, 1) if total_players > 0 else 0.0
                    
                    achievements_data[ach_id] = {
                        "unlocked": ach_info["unlocked"],
                        "level": current_lvl,
                        "roman": ach_info["roman"],
                        "current": ach_info["current"],
                        "target": ach_info["target"],
                        "percent": pct
                    }

                # Best map
                best_map = get_player_best_map(player_name)
                
                # Max streak
                max_streak = stats.get("max_streak", {}).get(player_name, 0)
                
                # Playtime & Kills per min
                playtime = player_m_stats.get("playtime", 0.0)
                kills = stats.get("kills", {}).get(player_name, 0)
                deaths = stats.get("deaths", {}).get(player_name, 0)
                kd = round(kills / deaths, 2) if deaths > 0 else float(kills)
                kills_per_min = round(kills / playtime, 2) if playtime > 0.0 else 0.0

                # Compute HS percentage
                hits_val = stats.get("hits", {}).get(player_name, 0)
                hs_val = stats.get("headshots", {}).get(player_name, 0)
                hs_percent = round((hs_val / hits_val) * 100, 1) if hits_val > 0 else 0.0

                # Compute hit location percentages
                raw_locs = stats.get("hit_locations", {}).get(player_name, {})
                total_located_hits = sum(raw_locs.values()) if raw_locs else 0
                hit_locations_pct = {}
                for zone in ["head", "torso", "arms", "groin", "legs"]:
                    count = raw_locs.get(zone, 0)
                    hit_locations_pct[zone] = {
                        "count": count,
                        "pct": round((count / total_located_hits) * 100, 1) if total_located_hits > 0 else 0.0
                    }

                avatar_url, avatar_orig = get_player_avatars(player_name)

                aim_highscore = 0
                reaction_highscore = 0
                spray_highscore = 0
                fof_highscore = 0
                grenade_highscore = 0
                try:
                    conn = sqlite3.connect(DB_FILE)
                    c = conn.cursor()
                    c.execute("SELECT aim_highscore, reaction_highscore, spray_highscore, fof_highscore, grenade_highscore FROM users WHERE LOWER(player_name) = LOWER(?)", (clean_name(player_name),))
                    res = c.fetchone()
                    if not res:
                        # Fallback for users who haven't linked a player name yet
                        c.execute("SELECT aim_highscore, reaction_highscore, spray_highscore, fof_highscore, grenade_highscore FROM users WHERE LOWER(username) = LOWER(?)", (clean_name(player_name),))
                        res = c.fetchone()
                    if res:
                        aim_highscore = res[0] or 0
                        reaction_highscore = res[1] or 0
                        spray_highscore = res[2] or 0
                        fof_highscore = res[3] or 0
                        grenade_highscore = res[4] or 0
                    conn.close()
                except Exception as e:
                    print("Erro ao buscar minigames highscores:", e)

                data = {
                    "player": player_name,
                    "kills": kills,
                    "deaths": deaths,
                    "kd": kd,
                    "killsPerMin": kills_per_min,
                    "topWeapon": top_weapon,
                    "bestMap": best_map,
                    "maxStreak": max_streak,
                    "favoriteVictim": fav_victim,
                    "favoriteVictimKills": fav_victim_kills,
                    "nemesis": nemesis,
                    "nemesisKills": nemesis_kills,
                    "avatar": avatar_url,
                    "avatar_original": avatar_orig or avatar_url,
                    "hsPercent": hs_percent,
                    "achievements": achievements_data,
                    "hitLocations": hit_locations_pct,
                    "totalHits": total_located_hits,
                    "aimHighscore": aim_highscore,
                    "reactionHighscore": reaction_highscore,
                    "sprayHighscore": spray_highscore,
                    "fofHighscore": fof_highscore,
                    "grenadeHighscore": grenade_highscore
                }
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        if self.path == "/history":
            try:
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("SELECT map, date, mvp, kills, scoreboard FROM matches WHERE kills > 0 ORDER BY id ASC")
                rows = c.fetchall()
                conn.close()
                history = []
                for row in rows:
                    scoreboard_list = json.loads(row[4]) if row[4] else []
                    for p_score in scoreboard_list:
                        avatar_url, avatar_orig = get_player_avatars(p_score["player"])
                        p_score["avatar"] = avatar_url
                        p_score["avatar_original"] = avatar_orig or avatar_url
                    history.append({
                        "map": row[0],
                        "date": row[1],
                        "mvp": row[2],
                        "kills": row[3],
                        "scoreboard": scoreboard_list
                    })
            except Exception as e:
                print("Erro ao carregar historico do BD:", e)
                history = []
            
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(history).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        if self.path == "/register":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                username = data.get("username", "").strip()
                password = data.get("password", "").strip()
                
                if not username or not password:
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Usuario e senha obrigatorios")
                    return
                
                cleaned_user = clean_name(username)
                if not cleaned_user or len(cleaned_user) < 3 or len(cleaned_user) > 20:
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Usuario invalido (3-20 caracteres)")
                    return

                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("SELECT username FROM users WHERE username = ?", (cleaned_user,))
                if c.fetchone():
                    conn.close()
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Usuario ja cadastrado")
                    return
                
                pwd_hash = hash_password(password)
                c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (cleaned_user, pwd_hash))
                conn.commit()
                
                player_name_payload = data.get("player_name", "").strip()
                auth_code_payload = data.get("auth_code", "").strip()
                
                linked_player = None
                if player_name_payload and auth_code_payload:
                    cleaned_player = clean_name(player_name_payload)
                    if verify_auth_code(cleaned_player, auth_code_payload):
                        c.execute("SELECT username FROM users WHERE player_name = ?", (cleaned_player,))
                        already_linked = c.fetchone()
                        if not already_linked:
                            c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_player, cleaned_user))
                            conn.commit()
                            linked_player = cleaned_player
                            print(f"[INFO] Auto-linked register session player '{cleaned_player}' to user '{cleaned_user}'.")
                
                if not linked_player:
                    c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_user,))
                    prof_exists = c.fetchone()
                    if prof_exists:
                        c.execute("SELECT username FROM users WHERE player_name = ?", (cleaned_user,))
                        already_linked = c.fetchone()
                        if not already_linked:
                            c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_user, cleaned_user))
                            conn.commit()
                            linked_player = cleaned_user
                            print(f"[INFO] Auto-linked register username '{cleaned_user}' to player profile.")
                
                conn.close()
                
                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "auto_linked": linked_player}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/login":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                username = data.get("username", "").strip()
                password = data.get("password", "").strip()
                player_name_payload = data.get("player_name", "").strip()
                auth_code_payload = data.get("auth_code", "").strip()
                
                cleaned_user = clean_name(username)
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("SELECT password_hash, player_name, aim_highscore FROM users WHERE username = ?", (cleaned_user,))
                res = c.fetchone()
                
                if not res or not verify_password(res[0], password):
                    conn.close()
                    self.send_response(401)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Usuario ou senha incorretos")
                    return
                
                player_name = res[1]
                aim_highscore = res[2]
                
                if not player_name and player_name_payload and auth_code_payload:
                    cleaned_player = clean_name(player_name_payload)
                    if verify_auth_code(cleaned_player, auth_code_payload):
                        c.execute("SELECT username FROM users WHERE player_name = ?", (cleaned_player,))
                        already_linked = c.fetchone()
                        if not already_linked:
                            c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_player, cleaned_user))
                            conn.commit()
                            player_name = cleaned_player
                            print(f"[INFO] Auto-linked login session player '{cleaned_player}' to user '{cleaned_user}'.")
                
                if not player_name:
                    c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_user,))
                    prof_exists = c.fetchone()
                    if prof_exists:
                        c.execute("SELECT username FROM users WHERE player_name = ?", (cleaned_user,))
                        already_linked = c.fetchone()
                        if not already_linked:
                            c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_user, cleaned_user))
                            conn.commit()
                            player_name = cleaned_user
                            print(f"[INFO] Auto-linked login username '{cleaned_user}' to player profile.")
                
                session_token = str(uuid.uuid4())
                c.execute("UPDATE users SET session_token = ? WHERE username = ?", (session_token, cleaned_user))
                conn.commit()
                conn.close()
                
                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "ok",
                    "username": cleaned_user,
                    "player_name": player_name,
                    "session_token": session_token,
                    "aim_highscore": aim_highscore
                }).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/link-player":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                username = data.get("username", "").strip()
                session_token = data.get("session_token", "").strip()
                player_name = data.get("player_name", "").strip()
                auth_code = data.get("auth_code", "").strip()
                
                cleaned_user = clean_name(username)
                cleaned_player = clean_name(player_name)
                
                if not cleaned_user or not session_token or not cleaned_player or not auth_code:
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Campos obrigatorios faltando")
                    return
                
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("SELECT session_token FROM users WHERE username = ?", (cleaned_user,))
                res = c.fetchone()
                
                if not res or res[0] != session_token:
                    conn.close()
                    self.send_response(401)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Sessao invalida. Faca login novamente.")
                    return
                
                c.execute("SELECT username FROM users WHERE player_name = ? AND username != ?", (cleaned_player, cleaned_user))
                claimed = c.fetchone()
                if claimed:
                    conn.close()
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Este personagem ja esta vinculado a outra conta")
                    return
                
                if verify_auth_code(player_name, auth_code):
                    c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_player, cleaned_user))
                    
                    c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_player,))
                    if not c.fetchone():
                        c.execute("INSERT INTO profiles (name) VALUES (?)", (cleaned_player,))
                        
                    conn.commit()
                    conn.close()
                    
                    self.send_response(200)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "ok", "player_name": cleaned_player}).encode("utf-8"))
                else:
                    conn.close()
                    self.send_response(403)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Codigo de autenticacao invalido ou expirado")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/rename-player":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                username = data.get("username", "").strip()
                session_token = data.get("session_token", "").strip()
                new_player_name = data.get("new_player_name", "").strip()
                auth_code = data.get("auth_code", "").strip()
                
                cleaned_user = clean_name(username)
                cleaned_new_player = clean_name(new_player_name)
                
                if not cleaned_user or not session_token or not cleaned_new_player or not auth_code:
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Campos obrigatorios faltando")
                    return
                
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("SELECT session_token, player_name FROM users WHERE username = ?", (cleaned_user,))
                res = c.fetchone()
                
                if not res or res[0] != session_token:
                    conn.close()
                    self.send_response(401)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Sessao invalida. Faca login novamente.")
                    return
                
                old_player_name = res[1]
                if not old_player_name:
                    conn.close()
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Voce precisa vincular um personagem primeiro")
                    return
                
                c.execute("SELECT username FROM users WHERE player_name = ? AND username != ?", (cleaned_new_player, cleaned_user))
                claimed = c.fetchone()
                if claimed:
                    conn.close()
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"O novo nick ja esta vinculado a outra conta")
                    return
                
                if verify_auth_code(new_player_name, auth_code):
                    conn.close()
                    success = rename_player_data(old_player_name, cleaned_new_player)
                    
                    if success:
                        conn = sqlite3.connect(DB_FILE)
                        c = conn.cursor()
                        c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_new_player, cleaned_user))
                        conn.commit()
                        conn.close()
                        
                        self.send_response(200)
                        self.end_cors()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "ok", "player_name": cleaned_new_player}).encode("utf-8"))
                    else:
                        self.send_response(500)
                        self.end_cors()
                        self.end_headers()
                        self.wfile.write(b"Erro interno ao renomear dados do jogador")
                else:
                    conn.close()
                    self.send_response(403)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Codigo de autenticacao para o novo nick invalido ou expirado")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return
        if self.path == "/update-highscore":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                username = data.get("username", "").strip()
                session_token = data.get("session_token", "").strip()
                highscore = int(data.get("highscore", 0))
                
                cleaned_user = clean_name(username)
                
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("SELECT session_token, aim_highscore FROM users WHERE username = ?", (cleaned_user,))
                res = c.fetchone()
                
                if not res or res[0] != session_token:
                    conn.close()
                    self.send_response(401)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Sessao expirada.")
                    return
                
                current_highscore = res[1]
                if highscore > current_highscore:
                    c.execute("UPDATE users SET aim_highscore = ? WHERE username = ?", (highscore, cleaned_user))
                    conn.commit()
                    current_highscore = highscore
                
                conn.close()
                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "aim_highscore": current_highscore}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/update-minigame-highscore":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                username = data.get("username", "").strip()
                session_token = data.get("session_token", "").strip()
                game_type = data.get("game_type", "").strip()
                highscore = int(data.get("highscore", 0))
                
                if game_type not in ["aim", "reaction", "spray", "fof", "grenade"]:
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Tipo de jogo invalido.")
                    return
                
                cleaned_user = clean_name(username)
                col_name = f"{game_type}_highscore"
                
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute(f"SELECT session_token, {col_name} FROM users WHERE username = ?", (cleaned_user,))
                res = c.fetchone()
                
                if not res or res[0] != session_token:
                    conn.close()
                    self.send_response(401)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Sessao expirada.")
                    return
                
                current_highscore = res[1] or 0
                updated = False
                
                if game_type == "reaction":
                    if highscore > 0 and (current_highscore == 0 or highscore < current_highscore):
                        c.execute(f"UPDATE users SET {col_name} = ? WHERE username = ?", (highscore, cleaned_user))
                        conn.commit()
                        current_highscore = highscore
                        updated = True
                else:
                    if highscore > current_highscore:
                        c.execute(f"UPDATE users SET {col_name} = ? WHERE username = ?", (highscore, cleaned_user))
                        conn.commit()
                        current_highscore = highscore
                        updated = True
                
                conn.close()
                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "highscore": current_highscore, "updated": updated}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/reset":
            try:
                content_length = int(self.headers["Content-Length"])
                raw = self.rfile.read(content_length)
                data = json.loads(raw.decode("utf-8"))

                if data.get("password") != "coco":
                    self.send_response(403)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write("Senha inválida".encode("utf-8"))
                    return

                save_votes([])

                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(b"OK")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/claim-profile":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                name, code = data.get("name"), data.get("code")
                
                if verify_auth_code(name, code):
                    self.send_response(200)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"OK")
                else:
                    self.send_response(403)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Codigo invalido ou expirado")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/upload-avatar":
            try:
                content_length = int(self.headers["Content-Length"])
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                name, code, b64_image = data.get("name"), data.get("code"), data.get("image")
                b64_original = data.get("originalImage")
                username = data.get("username")
                session_token = data.get("session_token")
                
                authorized = False
                cleaned_name = clean_name(name)
                
                if username and session_token:
                    cleaned_user = clean_name(username)
                    conn = sqlite3.connect(DB_FILE)
                    c = conn.cursor()
                    c.execute("SELECT session_token, player_name FROM users WHERE username = ?", (cleaned_user,))
                    res = c.fetchone()
                    conn.close()
                    
                    if res and res[0] == session_token:
                        db_player = res[1]
                        if db_player:
                            if clean_name(db_player) == cleaned_name:
                                authorized = True
                        else:
                            if cleaned_user == cleaned_name:
                                authorized = True
                
                if not authorized and code:
                    if verify_auth_code(name, code):
                        authorized = True
                
                if authorized:
                    url = save_avatar(name, b64_image, b64_original)
                    if url:
                        self.send_response(200)
                        self.end_cors()
                        self.end_headers()
                        self.wfile.write(json.dumps({"url": url}).encode("utf-8"))
                    else:
                        self.send_response(500)
                        self.end_cors()
                        self.end_headers()
                        self.wfile.write(b"Erro ao processar imagem")
                else:
                    self.send_response(403)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Acesso negado: codigo invalido ou sessao expirada")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/server-start":
            try:
                # Evita iniciar múltiplos se já estiver rodando
                is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
                if is_running:
                    self.send_response(400)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write(b"Servidor ja esta rodando")
                    return

                content_length = int(self.headers["Content-Length"])
                raw = self.rfile.read(content_length)
                data = json.loads(raw.decode("utf-8"))

                # Save mapcycle
                mapcycle_data = data["mapcycle"]
                mapcycle_path = "/home/lucas/Documentos/urbanterror43/q3ut4/mapcycle.txt"
                with open(mapcycle_path, "w", encoding="utf-8") as f:
                    f.write(mapcycle_data)

                # Update starting map in server.cfg
                # O primeiro mapa é a primeira linha não vazia do mapcycle
                lines = [l.strip() for l in mapcycle_data.split('\n') if l.strip()]
                if lines:
                    first_map = lines[0]
                    cfg_path = "/home/lucas/Documentos/urbanterror43/q3ut4/server.cfg"
                    if os.path.exists(cfg_path):
                        with open(cfg_path, "r", encoding="utf-8") as f:
                            cfg_content = f.read()
                        
                        # Substitui a linha 'map nome_do_mapa' ou 'set map nome_do_mapa'
                        # Usando regex para encontrar a linha que começa com map ou set map
                        new_cfg_content, count1 = re.subn(r'(?m)^map\s+\S+', 'map ' + first_map, cfg_content)
                        new_cfg_content, count2 = re.subn(r'(?m)^set\s+map\s+\S+', 'set map ' + first_map, new_cfg_content)

                        # Se não encontrou nenhuma das formas, adiciona ao final
                        if count1 == 0 and count2 == 0:
                            new_cfg_content += f"\nmap {first_map}\n"

                        # Garantir que g_loghits seja sempre "1"
                        new_cfg_content, count_lh = re.subn(r'(?m)^(\s*set\s+)?g_loghits\s+.*', 'set g_loghits "1"', new_cfg_content)
                        if count_lh == 0:
                            new_cfg_content += '\nset g_loghits "1"\n'

                        # Extrai g_gear e g_gametype do mapcycle para sincronizar no primeiro mapa
                        # Busca o bloco do primeiro mapa no mapcycle_data
                        map_block_match = re.search(rf"^{re.escape(first_map)}\s*\n\{{(.*?)\}}", mapcycle_data, re.DOTALL | re.MULTILINE)
                        if map_block_match:
                            block_content = map_block_match.group(1)
                            gear_match = re.search(r"g_gear\s+\"?(.*?)\"?(?:\n|$)", block_content)
                            gametype_match = re.search(r"g_gametype\s+(\d+)", block_content)
                            ff_match = re.search(r"g_friendlyfire\s+(\d+)", block_content)
                            roundlimit_match = re.search(r"roundlimit\s+(\d+)", block_content)
                            timelimit_match = re.search(r"timelimit\s+(\d+)", block_content)
                            fraglimit_match = re.search(r"fraglimit\s+(\d+)", block_content)
                            
                            if gear_match:
                                gear_val = gear_match.group(1)
                                new_cfg_content, c = re.subn(r'(?m)^(set\s+)?g_gear\s+.*', r'set g_gear "' + gear_val + '"', new_cfg_content)
                                if c == 0: new_cfg_content += f'\nset g_gear "{gear_val}"\n'
                            if gametype_match:
                                gt_val = gametype_match.group(1)
                                new_cfg_content, c = re.subn(r'(?m)^(set\s+)?g_gametype\s+\d+', r'set g_gametype ' + gt_val, new_cfg_content)
                                if c == 0: new_cfg_content += f'\nset g_gametype {gt_val}\n'
                            if ff_match:
                                ff_val = ff_match.group(1)
                                new_cfg_content, c = re.subn(r'(?m)^(set\s+)?g_friendlyfire\s+\d+', r'set g_friendlyfire ' + ff_val, new_cfg_content)
                                if c == 0: new_cfg_content += f'\nset g_friendlyfire {ff_val}\n'
                            if roundlimit_match:
                                rl_val = roundlimit_match.group(1)
                                new_cfg_content, c = re.subn(r'(?m)^(set\s+)?roundlimit\s+\d+', r'set roundlimit ' + rl_val, new_cfg_content)
                                if c == 0: new_cfg_content += f'\nset roundlimit {rl_val}\n'
                            if timelimit_match:
                                tl_val = timelimit_match.group(1)
                                new_cfg_content, c = re.subn(r'(?m)^(\s*set\s+)?timelimit\s+\d+', r'set timelimit ' + tl_val, new_cfg_content)
                                if c == 0: new_cfg_content += f'\nset timelimit {tl_val}\n'
                            if fraglimit_match:
                                fl_val = fraglimit_match.group(1)
                                new_cfg_content, c = re.subn(r'(?m)^(\s*set\s+)?fraglimit\s+\d+', r'set fraglimit ' + fl_val, new_cfg_content)
                                if c == 0: new_cfg_content += f'\nset fraglimit {fl_val}\n'

                            # Removemos o sv_joinmessage para não causar conflito
                            new_cfg_content = re.sub(r'(?m)^(set\s+)?sv_joinmessage\s+".*?"', r'set sv_joinmessage ""', new_cfg_content)

                        with open(cfg_path, "w", encoding="utf-8") as f:
                            f.write(new_cfg_content)

                # Start server
                subprocess.Popen(["/home/lucas/Documentos/urbanterror43/start.sh"],
                                 cwd="/home/lucas/Documentos/urbanterror43",
                                 stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL,
                                 start_new_session=True)

                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(b"OK")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path == "/server-stop":
            try:
                # Mata o script de loop e o processo do jogo
                os.system("pkill -f start.sh")
                os.system("pkill -f Quake3-UrT-Ded.x86_64")

                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(b"OK")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return
            
        if self.path == "/admin":
            try:
                content_length = int(self.headers["Content-Length"])
                raw = self.rfile.read(content_length)
                data = json.loads(raw.decode("utf-8"))

                if data.get("password") != "coco":
                    self.send_response(403)
                    self.end_cors()
                    self.end_headers()
                    self.wfile.write("Senha inválida".encode("utf-8"))
                    return
                
                cmd_type = data.get("cmd_type")
                if cmd_type == "kick":
                    player = data.get("player")
                    send_rcon(f"kick {player}")
                elif cmd_type == "map":
                    map_name = data.get("map")
                    send_rcon(f"map {map_name}")
                elif cmd_type == "say":
                    msg = data.get("msg")
                    send_rcon(f'bigtext "{msg}"')
                    send_rcon(f'say "{msg}"')

                self.send_response(200)
                self.end_cors()
                self.end_headers()
                self.wfile.write(b"OK")
            except Exception as e:
                self.send_response(500)
                self.end_cors()
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        if self.path != "/vote":
            self.send_response(404)
            self.end_headers()
            return

        try:
            content_length = int(self.headers["Content-Length"])
            raw = self.rfile.read(content_length)
            data = json.loads(raw.decode("utf-8"))

            votes = [v for v in load_votes() if v["date"] == today()]
            
            already_voted = any(
                v["browserId"] == data["browserId"]
                and v["map"] == data["map"]
                and v["date"] == today()
                for v in votes
            )

            if already_voted:
                self.send_response(400)
                self.end_cors()
                self.end_headers()
                self.wfile.write("Você já votou neste mapa hoje".encode("utf-8"))
                return

            mode = data.get("mode", "4")
            weapon = data.get("weapon", "Todas as armas")
            custom_weapons = data.get("customWeapons", [])
            friendly_fire = data.get("friendlyFire", "0")
            timelimit = data.get("timelimit")
            fraglimit = data.get("fraglimit")

            if mode == "11":  # Gun Game
                weapon = "Todas as armas"
                custom_weapons = []
                friendly_fire = "0"
                fraglimit = None
            elif mode in ("1", "2"):  # LMS or FFA
                friendly_fire = "0"

            votes.append({
                "browserId": data["browserId"],
                "map": data["map"],
                "mode": mode,
                "weapon": weapon,
                "customWeapons": custom_weapons,
                "friendlyFire": friendly_fire,
                "timelimit": timelimit,
                "fraglimit": fraglimit,
                "date": today()
            })

            save_votes(votes)

            self.send_response(200)
            self.end_cors()
            self.end_headers()
            self.wfile.write(b"OK")

        except Exception as e:
            self.send_response(500)
            self.end_cors()
            self.end_headers()
            self.wfile.write(str(e).encode("utf-8"))


if __name__ == "__main__":
    os.chdir(BASE_DIR)

    HTTPServer.allow_reuse_address = True
    server = HTTPServer((HOST, PORT), VoteServer)

    load_stats()
    migrate_history_to_db()
    update_cached_match_stats()
    t = threading.Thread(target=parse_logs_worker, daemon=True)
    t.start()

    print(f"Servidor rodando em http://{HOST}:{PORT}")
    server.serve_forever()