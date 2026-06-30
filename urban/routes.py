import json
import subprocess
import os
import re
import sqlite3
from core.router import router
from core.config import DB_FILE, clean_name
from core.utils import load_votes, save_votes, today
from core.avatar import get_player_avatars
from urban.stats import global_stats, stats_lock, cached_match_stats, cached_match_stats_lock
from urban.rcon import get_default_limits, send_rcon_sync
from urban.achievements import get_achievements_levels, check_achievements

@router.get("/server-status")
def server_status(req, res):
    is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
    t_lim, f_lim = get_default_limits()
    
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps({
        "running": is_running,
        "default_timelimit": t_lim,
        "default_fraglimit": f_lim
    }).encode("utf-8"))

@router.get("/server-live")
def server_live(req, res):
    is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
    if not is_running:
        if os.path.exists("mock_live.txt"):
            try:
                with open("mock_live.txt", "r") as f:
                    mock_data = json.loads(f.read())
                for p in mock_data.get("players", []):
                    avatar_url, avatar_orig = get_player_avatars(p["name"])
                    p["avatar"] = avatar_url
                    p["avatar_original"] = avatar_orig or avatar_url
                res.send_response(200)
                res.end_cors()
                res.send_header("Content-Type", "application/json")
                res.end_headers()
                res.wfile.write(json.dumps(mock_data).encode("utf-8"))
                return
            except Exception as e:
                print("Erro ao ler mock_live.txt:", e)
        
        res.send_response(200)
        res.end_cors()
        res.send_header("Content-Type", "application/json")
        res.end_headers()
        res.wfile.write(json.dumps({"running": False, "players": [], "map": ""}).encode("utf-8"))
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
                    name_clean = re.sub(r'\^\d', '', name)
                    avatar_url, avatar_orig = get_player_avatars(name_clean)
                    players.append({
                        "name": name_clean, 
                        "ping": ping, 
                        "score": parts[1],
                        "avatar": avatar_url,
                        "avatar_original": avatar_orig or avatar_url
                    })
    
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps({"running": True, "players": players, "map": map_name}).encode("utf-8"))

@router.get("/kills")
def kills(req, res):
    period = req["query"].get("period", ["all"])[0]
    
    with stats_lock:
        stats_to_use = global_stats.get(period, global_stats["all"])
        players = set(stats_to_use.get("kills", {})) | set(stats_to_use.get("deaths", {}))
        result = []
        for p in players:
            k = stats_to_use.get("kills", {}).get(p, 0)
            d = stats_to_use.get("deaths", {}).get(p, 0)
            top_weapon = ""
            weapons = stats_to_use.get("weapons", {}).get(p, {})
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

    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps(result).encode("utf-8"))

@router.get("/profile")
def profile(req, res):
    player_name = req["query"].get("player", [""])[0]
    
    # We need get_player_best_map
    def get_player_best_map(p_name):
        player_clean = clean_name(p_name)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT map, scoreboard FROM matches")
        rows = c.fetchall()
        conn.close()
        
        map_kills = {}
        for map_n, scoreboard_json in rows:
            if not scoreboard_json:
                continue
            try:
                sb = json.loads(scoreboard_json)
                for entry in sb:
                    if clean_name(entry["player"]) == player_clean:
                        map_kills[map_n] = map_kills.get(map_n, 0) + entry.get("kills", 0)
            except Exception:
                pass
        if not map_kills:
            return "Nenhum"
        return max(map_kills, key=map_kills.get)

    with stats_lock:
        stats = global_stats["all"]
        relationships = stats.get("relationships", {})
        
        fav_victim = "Ninguém"
        fav_victim_kills = 0
        if player_name in relationships and relationships[player_name]:
            fav_victim = max(relationships[player_name], key=relationships[player_name].get)
            fav_victim_kills = relationships[player_name][fav_victim]
        
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

        best_map = get_player_best_map(player_name)
        max_streak = stats.get("max_streak", {}).get(player_name, 0)
        
        playtime = player_m_stats.get("playtime", 0.0)
        kills_val = stats.get("kills", {}).get(player_name, 0)
        deaths_val = stats.get("deaths", {}).get(player_name, 0)
        kd = round(kills_val / deaths_val, 2) if deaths_val > 0 else float(kills_val)
        kills_per_min = round(kills_val / playtime, 2) if playtime > 0.0 else 0.0

        hits_val = stats.get("hits", {}).get(player_name, 0)
        hs_val = stats.get("headshots", {}).get(player_name, 0)
        hs_percent = round((hs_val / hits_val) * 100, 1) if hits_val > 0 else 0.0

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
            res_db = c.fetchone()
            if not res_db:
                c.execute("SELECT aim_highscore, reaction_highscore, spray_highscore, fof_highscore, grenade_highscore FROM users WHERE LOWER(username) = LOWER(?)", (clean_name(player_name),))
                res_db = c.fetchone()
            if res_db:
                aim_highscore = res_db[0] or 0
                reaction_highscore = res_db[1] or 0
                spray_highscore = res_db[2] or 0
                fof_highscore = res_db[3] or 0
                grenade_highscore = res_db[4] or 0
            conn.close()
        except Exception as e:
            print("Erro ao buscar minigames highscores:", e)

        data = {
            "player": player_name,
            "kills": kills_val,
            "deaths": deaths_val,
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
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps(data).encode("utf-8"))

@router.get("/history")
def history(req, res):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT map, date, mvp, kills, scoreboard FROM matches WHERE kills > 0 ORDER BY id ASC")
        rows = c.fetchall()
        conn.close()
        history_data = []
        for row in rows:
            scoreboard_list = json.loads(row[4]) if row[4] else []
            for p_score in scoreboard_list:
                avatar_url, avatar_orig = get_player_avatars(p_score["player"])
                p_score["avatar"] = avatar_url
                p_score["avatar_original"] = avatar_orig or avatar_url
            history_data.append({
                "map": row[0],
                "date": row[1],
                "mvp": row[2],
                "kills": row[3],
                "scoreboard": scoreboard_list
            })
    except Exception as e:
        print("Erro ao carregar historico do BD:", e)
        history_data = []
    
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps(history_data).encode("utf-8"))

@router.get("/votes")
def get_votes(req, res):
    votes = [v for v in load_votes() if v["date"] == today()]
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps(votes).encode("utf-8"))

@router.get("/api/votes")
def api_get_votes(req, res):
    votes = [v for v in load_votes() if v["date"] == today()]
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps(votes).encode("utf-8"))

@router.post("/api/votes/add")
def add_vote(req, res):
    data = req["body"]
    if not data or "user" not in data or "map" not in data:
        res.send_response(400)
        res.end_cors()
        res.end_headers()
        res.wfile.write(b"Invalid request")
        return
        
    all_votes = load_votes()
    
    # Remove previous vote from this user for today
    filtered_votes = [v for v in all_votes if not (v["user"] == data["user"] and v["date"] == today())]
    
    new_vote = {
        "user": data["user"],
        "map": data["map"],
        "mode": data.get("mode", ""),
        "weapons": data.get("weapons", ""),
        "friendly_fire": data.get("friendly_fire", ""),
        "date": today()
    }
    filtered_votes.append(new_vote)
    save_votes(filtered_votes)
    
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))

@router.post("/reset")
def reset_votes(req, res):
    data = req["body"]
    if data.get("password") != "coco":
        res.send_response(403)
        res.end_cors()
        res.end_headers()
        res.wfile.write(b"Senha invalida")
        return

    save_votes([])

    res.send_response(200)
    res.end_cors()
    res.end_headers()
    res.wfile.write(b"OK")

@router.post("/server-start")
def server_start(req, res):
    try:
        is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
        if is_running:
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Servidor ja esta rodando")
            return

        data = req["body"]
        mapcycle_data = data["mapcycle"]
        mapcycle_path = "/home/lucas/Documentos/urbanterror43/q3ut4/mapcycle.txt"
        with open(mapcycle_path, "w", encoding="utf-8") as f:
            f.write(mapcycle_data)

        lines = [l.strip() for l in mapcycle_data.split('\n') if l.strip()]
        if lines:
            first_map = lines[0]
            cfg_path = "/home/lucas/Documentos/urbanterror43/q3ut4/server.cfg"
            if os.path.exists(cfg_path):
                with open(cfg_path, "r", encoding="utf-8") as f:
                    cfg_content = f.read()
                
                new_cfg_content, count1 = re.subn(r'(?m)^map\s+\S+', 'map ' + first_map, cfg_content)
                new_cfg_content, count2 = re.subn(r'(?m)^set\s+map\s+\S+', 'set map ' + first_map, new_cfg_content)

                if count1 == 0 and count2 == 0:
                    new_cfg_content += f"\nmap {first_map}\n"

                new_cfg_content, count_lh = re.subn(r'(?m)^(\s*set\s+)?g_loghits\s+.*', 'set g_loghits "1"', new_cfg_content)
                if count_lh == 0:
                    new_cfg_content += '\nset g_loghits "1"\n'

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

                    new_cfg_content = re.sub(r'(?m)^(set\s+)?sv_joinmessage\s+".*?"', r'set sv_joinmessage ""', new_cfg_content)

                with open(cfg_path, "w", encoding="utf-8") as f:
                    f.write(new_cfg_content)

        subprocess.Popen(["/home/lucas/Documentos/urbanterror43/start.sh"],
                         cwd="/home/lucas/Documentos/urbanterror43",
                         stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL,
                         start_new_session=True)

        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(b"OK")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/server-stop")
def server_stop(req, res):
    try:
        os.system("pkill -f start.sh")
        os.system("pkill -f Quake3-UrT-Ded.x86_64")
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(b"OK")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))
        
@router.post("/admin")
def admin(req, res):
    try:
        data = req["body"]
        if data.get("password") != "coco":
            res.send_response(403)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Senha invalida")
            return
        
        cmd_type = data.get("cmd_type")
        from urban.rcon import send_rcon
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

        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(b"OK")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

