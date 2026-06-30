import os
import json
import subprocess
from core.router import router

@router.get("/api/cs/status")
def cs_status(req, res):
    try:
        proc = subprocess.run(["pgrep", "-f", "srcds_run -game cstrike"], capture_output=True, text=True)
        is_running = bool(proc.stdout.strip())
        
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"running": is_running}).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

@router.post("/api/cs/start")
def cs_start(req, res):
    try:
        script_path = os.environ.get("CS_SERVER_SCRIPT", "/var/docker/css-server/start_css_server.sh")
        if os.path.exists(script_path):
            subprocess.Popen(["/bin/bash", script_path], cwd=os.path.dirname(script_path))
            res.send_response(200)
            res.end_cors()
            res.end_headers()
            res.wfile.write(json.dumps({"status": "success", "message": "Servidor de CS:S Iniciado!"}).encode("utf-8"))
        else:
            res.send_response(404)
            res.end_cors()
            res.end_headers()
            res.wfile.write(json.dumps({"status": "error", "message": "Script de inicialização não encontrado."}).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

@router.post("/api/cs/stop")
def cs_stop(req, res):
    try:
        subprocess.run(["killall", "-q", "srcds_linux"])
        subprocess.run(["killall", "-q", "srcds_run"])
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"status": "success", "message": "Servidor de CS:S Desligado!"}).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
