from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import re
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
                mapcycle_path = "/home/lucas/Documentos/urbanterror43/q3ut4/mapcycle.txt"
                with open(mapcycle_path, "w", encoding="utf-8") as f:
                    f.write(data["mapcycle"])

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