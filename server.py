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
                 (name TEXT PRIMARY KEY, avatar_url TEXT, auth_code TEXT, auth_expiry DATETIME)''')
    conn.commit()
    conn.close()

init_db()

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
    c.execute("SELECT auth_code, auth_expiry FROM profiles WHERE name = ?", (clean,))
    res = c.fetchone()
    conn.close()
    
    print(f"[DEBUG] Auth attempt: name='{name}', clean='{clean}', code='{code}'")
    if res:
        saved_code, expiry = res
        now = datetime.now().timestamp()
        print(f"[DEBUG] DB record: saved_code='{saved_code}', expiry={expiry}, now={now}")
        if str(saved_code) == str(code) and now < float(expiry):
            return True
        else:
            print(f"[DEBUG] Validation failed: code_match={str(saved_code) == str(code)}, time_ok={now < float(expiry)}")
    else:
        print(f"[DEBUG] No record found for '{clean}'")
    return False

def save_avatar(name, b64_data):
    if not b64_data: return None
    try:
        clean = clean_name(name)
        header, data = b64_data.split(",", 1)
        ext = "jpg"
        if "png" in header: ext = "png"
        elif "webp" in header: ext = "webp"
        
        filename = f"{clean.replace(' ', '_')}_{int(time.time())}.{ext}"
        filepath = os.path.join(AVATARS_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(data))
        
        url = f"avatars/{filename}"
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE profiles SET avatar_url = ? WHERE name = ?", (url, clean))
        conn.commit()
        conn.close()
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

def send_rcon(command):
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
    if "history" not in global_stats:
        global_stats["history"] = []

def save_stats():
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(global_stats, f)

def parse_logs_worker():
    while True:
        try:
            with stats_lock:
                today_str = datetime.now().strftime("%Y-%m-%d")
                if global_stats["daily_date"] != today_str:
                    global_stats["daily_date"] = today_str
                    global_stats["daily"] = {"kills": {}, "deaths": {}, "weapons": {}, "relationships": {}}
                    save_stats()
            
            current_match_kills = {}
            
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
                                current_match_kills = {}
                                
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
                                if current_map_name and current_match_kills:
                                    mvp = max(current_match_kills, key=current_match_kills.get) if current_match_kills else "Ninguém"
                                    global_stats.setdefault("history", []).append({
                                        "map": current_map_name,
                                        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                                        "mvp": mvp,
                                        "kills": current_match_kills.get(mvp, 0)
                                    })
                                    # Keep only last 20
                                    global_stats["history"] = global_stats["history"][-20:]
                                current_match_kills = {}
                                continue

                            m = KILL_RE.search(line)
                            if not m:
                                continue
                            killer, victim, weapon = m.group(1), m.group(2), m.group(3)
                            
                            for period in ["all", "daily"]:
                                stats = global_stats[period]
                                stats["deaths"][victim] = stats["deaths"].get(victim, 0) + 1
                                if killer != victim and killer != "<world>":
                                    stats["kills"][killer] = stats["kills"].get(killer, 0) + 1
                                    if killer not in stats["weapons"]:
                                        stats["weapons"][killer] = {}
                                    stats["weapons"][killer][weapon] = stats["weapons"][killer].get(weapon, 0) + 1
                                    
                                    if killer not in stats["relationships"]:
                                        stats["relationships"][killer] = {}
                                    stats["relationships"][killer][victim] = stats["relationships"][killer].get(victim, 0) + 1
                                    
                            if killer != victim and killer != "<world>":
                                current_match_kills[killer] = current_match_kills.get(killer, 0) + 1
                        
                        if new_data:
                            global_stats["offset"] = f.tell()
                            save_stats()
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
                result = []
                for p in players:
                    k = stats_to_use["kills"].get(p, 0)
                    d = stats_to_use["deaths"].get(p, 0)
                    top_weapon = ""
                    weapons = stats_to_use["weapons"].get(p, {})
                    if weapons:
                        top_weapon = max(weapons, key=weapons.get).replace("UT_MOD_", "")
                    
                    result.append({
                        "player": p, 
                        "kills": k, 
                        "deaths": d, 
                        "topWeapon": top_weapon,
                        "avatar": get_player_avatar(p)
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
            
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"running": is_running}).encode("utf-8"))
            return

        if self.path == "/server-live":
            is_running = subprocess.call(["pgrep", "Quake3-UrT-Ded."], stdout=subprocess.DEVNULL) == 0
            if not is_running:
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
                            clean_name = re.sub(r'\^\d', '', name)
                            players.append({"name": clean_name, "ping": ping, "score": parts[1]})
            
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
                    
                data = {
                    "player": player_name,
                    "kills": stats.get("kills", {}).get(player_name, 0),
                    "deaths": stats.get("deaths", {}).get(player_name, 0),
                    "topWeapon": top_weapon,
                    "favoriteVictim": fav_victim,
                    "favoriteVictimKills": fav_victim_kills,
                    "nemesis": nemesis,
                    "nemesisKills": nemesis_kills,
                    "avatar": get_player_avatar(player_name)
                }
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        if self.path == "/history":
            with stats_lock:
                history = global_stats.get("history", [])
            self.send_response(200)
            self.end_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(history).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
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
                
                if verify_auth_code(name, code):
                    url = save_avatar(name, b64_image)
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
                    self.wfile.write(b"Acesso negado")
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

                        # Extrai g_gear e g_gametype do mapcycle para sincronizar no primeiro mapa
                        # Busca o bloco do primeiro mapa no mapcycle_data
                        map_block_match = re.search(rf"^{re.escape(first_map)}\s*\n\{{(.*?)\}}", mapcycle_data, re.DOTALL | re.MULTILINE)
                        if map_block_match:
                            block_content = map_block_match.group(1)
                            gear_match = re.search(r"g_gear\s+\"?(.*?)\"?(?:\n|$)", block_content)
                            gametype_match = re.search(r"g_gametype\s+(\d+)", block_content)
                            ff_match = re.search(r"g_friendlyfire\s+(\d+)", block_content)
                            roundlimit_match = re.search(r"roundlimit\s+(\d+)", block_content)
                            
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

            votes.append({
                "browserId": data["browserId"],
                "map": data["map"],
                "mode": data["mode"],
                "weapon": data["weapon"],
                "customWeapons": data.get("customWeapons", []),
                "friendlyFire": data.get("friendlyFire", "0"),
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


os.chdir(BASE_DIR)

HTTPServer.allow_reuse_address = True
server = HTTPServer((HOST, PORT), VoteServer)

load_stats()
t = threading.Thread(target=parse_logs_worker, daemon=True)
t.start()

print(f"Servidor rodando em http://{HOST}:{PORT}")
server.serve_forever()