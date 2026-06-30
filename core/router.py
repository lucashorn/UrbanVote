import json
from urllib.parse import urlparse, parse_qs

class Router:
    def __init__(self):
        self.routes = {
            "GET": {},
            "POST": {},
            "OPTIONS": {}
        }

    def add_route(self, method, path, handler):
        self.routes[method.upper()][path] = handler

    def get(self, path):
        def decorator(handler):
            self.add_route("GET", path, handler)
            return handler
        return decorator

    def post(self, path):
        def decorator(handler):
            self.add_route("POST", path, handler)
            return handler
        return decorator

    def handle(self, method, server_handler):
        parsed = urlparse(server_handler.path)
        path = parsed.path
        
        # Prepare request context
        req = {
            "path": path,
            "query": parse_qs(parsed.query),
            "headers": server_handler.headers,
            "server": server_handler,
            "body": None
        }

        # Parse body for POST requests
        if method == "POST":
            try:
                content_length = int(server_handler.headers.get("Content-Length", 0))
                if content_length > 0:
                    raw_body = server_handler.rfile.read(content_length).decode("utf-8")
                    req["body"] = json.loads(raw_body)
            except Exception as e:
                print(f"[Router] Error parsing POST body: {e}")
                server_handler.send_response(400)
                server_handler.end_cors()
                server_handler.end_headers()
                server_handler.wfile.write(b"Invalid JSON body")
                return

        # Find handler
        handler = self.routes.get(method, {}).get(path)
        if handler:
            try:
                handler(req, server_handler)
            except Exception as e:
                print(f"[Router] Error handling {method} {path}: {e}")
                server_handler.send_response(500)
                server_handler.end_cors()
                server_handler.end_headers()
                server_handler.wfile.write(str(e).encode("utf-8"))
        else:
            # Fallback for static files or undefined routes
            if method == "GET":
                if path == "/" or path == "":
                    server_handler.send_response(302)
                    server_handler.send_header('Location', '/select.html')
                    server_handler.end_headers()
                else:
                    # Let SimpleHTTPRequestHandler handle it
                    super(server_handler.__class__, server_handler).do_GET()
            else:
                server_handler.send_response(404)
                server_handler.end_cors()
                server_handler.end_headers()
                server_handler.wfile.write(b"Not Found")

# Global router instance
router = Router()

import http.server

class BaseServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_cors()
        self.end_headers()

    def do_GET(self):
        router.handle("GET", self)

    def do_POST(self):
        router.handle("POST", self)
