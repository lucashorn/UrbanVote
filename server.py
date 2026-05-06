from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import re
import socket
import subprocess
import threading
import time
from datetime import datetime
from urllib.parse import urlparse, parse_qs

HOST = "0.0.0.0"
PORT = 8085
BASE_DIR = "/var/www/html/urban"
VOTES_FILE = os.path.join(BASE_DIR, "votes.json")
GAMES_LOG = "/home/lucas/urbanterror43/q3ut4/games.log"
STATS_FILE = os.path.join(BASE_DIR, "kills_stats.json")

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
            allowed.append(letter) # Usamos a letra para comparar com os perfis
            
    # Perfis conhecidos
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
    
    # Traduz letras para nomes para o caso geral
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
            global_stats[p] = {"kills": {}, "deaths": {}, "weapons": {}}

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
                    global_stats["daily"] = {"kills": {}, "deaths": {}, "weapons": {}}
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
                                
                                msg = f"^2Armas Permitidas: ^7{weapons_text}"
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
                    result.append({"player": p, "kills": k, "deaths": d, "topWeapon": top_weapon})
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
                        # Usando regex para encontrar a linha que começa com map ou set map no final do arquivo
                        new_cfg_content = re.sub(r'(?m)^(map\s+)\S+', r'\1' + first_map, cfg_content)
                        # Também tenta 'set map' se o usuário mudar o estilo
                        new_cfg_content = re.sub(r'(?m)^(set\s+map\s+)\S+', r'\1' + first_map, new_cfg_content)

                        # Extrai g_gear e g_gametype do mapcycle para sincronizar no primeiro mapa
                        # Busca o bloco do primeiro mapa no mapcycle_data
                        map_block_match = re.search(rf"^{first_map}\s*\n\{{(.*?)\}}", mapcycle_data, re.DOTALL | re.MULTILINE)
                        if map_block_match:
                            block_content = map_block_match.group(1)
                            gear_match = re.search(r"g_gear\s+(\S+)", block_content)
                            gametype_match = re.search(r"g_gametype\s+(\d+)", block_content)
                            ff_match = re.search(r"g_friendlyfire\s+(\d+)", block_content)
                            
                            if gear_match:
                                gear_val = gear_match.group(1)
                                new_cfg_content = re.sub(r'(?m)^(set\s+)?g_gear\s+\S+', r'set g_gear "' + gear_val + '"', new_cfg_content)
                            if gametype_match:
                                gt_val = gametype_match.group(1)
                                new_cfg_content = re.sub(r'(?m)^(set\s+)?g_gametype\s+\d+', r'set g_gametype ' + gt_val, new_cfg_content)
                            if ff_match:
                                ff_val = ff_match.group(1)
                                new_cfg_content = re.sub(r'(?m)^(set\s+)?g_friendlyfire\s+\d+', r'set g_friendlyfire ' + ff_val, new_cfg_content)

                            # Removemos o sv_joinmessage para não causar conflito ou mensagens antigas
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