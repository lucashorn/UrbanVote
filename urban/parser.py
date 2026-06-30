import os
import re
import json
import time
import threading
import sqlite3
from datetime import datetime

import core.config
from core.config import GAMES_LOG, DB_FILE, clean_name
from urban.stats import global_stats, stats_lock, save_stats, cached_match_stats, cached_match_stats_lock, update_cached_match_stats
from urban.rcon import decode_gear, send_rcon, send_rcon_sync
from urban.achievements import ACHIEVEMENTS_NAMES, check_achievements, get_achievements_levels, update_and_check_achievement
from core.auth import set_auth_code

KILL_RE = re.compile(r"Kill: \d+ \d+ \d+: (.+?) killed (.+?) by (\S+)$")
INIT_RE = re.compile(r"InitGame: (.*)$")
BEGIN_RE = re.compile(r"ClientBegin: (\d+)$")

current_weapons_msg = "^2Armas: ^7Todas liberadas"
current_map_name = ""

def parse_logs_worker():
    import random
    current_match_stats = {}
    current_streaks = {}
    last_line_time = 0.0
    while True:
        try:
            with stats_lock:
                today_str = datetime.now().strftime("%Y-%m-%d")
                if global_stats.get("daily_date") != today_str:
                    if os.path.exists(GAMES_LOG):
                        current_size = os.path.getsize(GAMES_LOG)
                        if global_stats.get("offset", 0) >= current_size:
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
                    if current_size < global_stats.get("offset", 0):
                        global_stats["offset"] = 0
                
                with open(GAMES_LOG, "rb") as f:
                    with stats_lock:
                        f.seek(global_stats.get("offset", 0))
                        new_data = False
                        for raw in f:
                            new_data = True
                            line = raw.decode("utf-8", errors="replace")
                            
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
                                
                                def broadcast(m, m_name):
                                    time.sleep(10)
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
                                        send_rcon(f'tell {s} "{current_weapons_msg}"')
                                        time.sleep(3)
                                threading.Thread(target=welcome, args=(slot,), daemon=True).start()
                                continue

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
                                    
                                    scoreboard_data = []
                                    for p, p_stats in current_match_stats.items():
                                        scoreboard_data.append({
                                            "player": p,
                                            "kills": p_stats["kills"],
                                            "deaths": p_stats["deaths"]
                                        })
                                    scoreboard_data.sort(key=lambda x: (-x["kills"], x["deaths"]))

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

                            m_hit = re.search(r"Hit:\s+\d+\s+\d+\s+\d+\s+\d+:\s+(.+?)\s+hit\s+(.+?)\s+in\s+the\s+(.+)", line)
                            if m_hit:
                                attacker = m_hit.group(1)
                                location_raw = m_hit.group(3).strip().lower()
                                if location_raw in ("head", "helmet"):
                                    zone = "head"
                                elif location_raw in ("torso", "vest", "chest"):
                                    zone = "torso"
                                elif location_raw in ("arm", "arms", "leftarm", "rightarm", "left_arm", "right_arm", "left arm", "right arm"):
                                    zone = "arms"
                                elif location_raw in ("groin", "butt", "gluteus"):
                                    zone = "groin"
                                elif location_raw in ("leg", "legs", "leftleg", "rightleg", "left_leg", "right_leg", "foot", "feet", "left leg", "right leg"):
                                    zone = "legs"
                                else:
                                    zone = "torso"
                                def do_hit_update(a=attacker, z=zone):
                                    for period in ["all", "daily"]:
                                        stats = global_stats[period]
                                        stats["hits"][a] = stats.get("hits", {}).get(a, 0) + 1
                                        if z == "head":
                                            stats["headshots"][a] = stats.get("headshots", {}).get(a, 0) + 1
                                        if a not in stats["hit_locations"]:
                                            stats["hit_locations"][a] = {"head": 0, "torso": 0, "arms": 0, "groin": 0, "legs": 0}
                                        stats["hit_locations"][a][z] = stats["hit_locations"][a].get(z, 0) + 1
                                update_and_check_achievement(attacker, do_hit_update)
                                continue

                            m_hit_num = re.search(r"^\s*Hit:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", line)
                            if m_hit_num:
                                pass

                            m = KILL_RE.search(line)
                            if not m:
                                continue
                            killer, victim, weapon = m.group(1), m.group(2), m.group(3)
                            
                            victim_streak = current_streaks.get(victim, 0)
                            
                            def do_victim_update():
                                if victim_streak > 0:
                                    for period in ["all", "daily"]:
                                        stats = global_stats[period]
                                        stats["max_streak"][victim] = max(stats.get("max_streak", {}).get(victim, 0), victim_streak)
                                current_streaks[victim] = 0
                                
                                for period in ["all", "daily"]:
                                    stats = global_stats[period]
                                    stats["deaths"][victim] = stats.get("deaths", {}).get(victim, 0) + 1
                            
                            update_and_check_achievement(victim, do_victim_update)
                            
                            if killer != victim and killer != "<world>":
                                def do_killer_update():
                                    for period in ["all", "daily"]:
                                        stats = global_stats[period]
                                        stats["kills"][killer] = stats.get("kills", {}).get(killer, 0) + 1
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
                                            stats["triple_kills"][killer] = stats.get("triple_kills", {}).get(killer, 0) + 1
                                
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
                
                core.config.INITIAL_PARSE_DONE = True
        except Exception as e:
            print("Erro no log parser:", e)
        time.sleep(5)
