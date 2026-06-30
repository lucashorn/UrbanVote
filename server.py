import os
import threading
from http.server import HTTPServer

from core.config import HOST, PORT, BASE_DIR
from core.database import init_db
from core.router import router

from urban.stats import load_stats, migrate_history_to_db, update_cached_match_stats
from urban.parser import parse_logs_worker

import core.routes
import urban.routes
import cs.routes
import minigames.routes

if __name__ == "__main__":
    os.chdir(BASE_DIR)

    init_db()

    load_stats()
    migrate_history_to_db()
    update_cached_match_stats()
    
    t = threading.Thread(target=parse_logs_worker, daemon=True)
    t.start()

    from core.router import BaseServerHandler
    HTTPServer.allow_reuse_address = True
    server = HTTPServer((HOST, PORT), BaseServerHandler)
    print(f"Servidor modular rodando em http://{HOST}:{PORT}")
    server.serve_forever()