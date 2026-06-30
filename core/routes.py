import json
import sqlite3
import uuid
from core.router import router
from core.config import DB_FILE, clean_name
from core.auth import hash_password, verify_password, verify_auth_code, verify_session_and_get_user
from core.avatar import get_player_avatars, save_avatar
from urban.stats import global_stats, stats_lock, rename_player_data

@router.get("/players-all")
def players_all(req, res):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT username, player_name,
                   aim_highscore, reaction_highscore, spray_highscore, fof_highscore, grenade_highscore
            FROM users
            WHERE username IS NOT NULL AND username != ''
        """)
        rows = c.fetchall()
        conn.close()

        with stats_lock:
            stats_all = global_stats.get("all", {})
            kills_map = stats_all.get("kills", {})
            deaths_map = stats_all.get("deaths", {})
            log_players = set(kills_map.keys()) | set(deaths_map.keys())

        result = []
        seen = set()
        for row in rows:
            usr, player, aim, react, spray, fof, gren = row
            display = player if player else usr
            if not display or display in seen:
                continue
            seen.add(display)

            has_minigame = any([aim, react, spray, fof, gren])
            has_kills = kills_map.get(display, 0) > 0 or kills_map.get(usr, 0) > 0

            avatar_url, _ = get_player_avatars(display)

            result.append({
                "display": display,
                "has_minigame": has_minigame,
                "has_kills": has_kills,
                "linked": bool(player),
                "avatar": avatar_url
            })

        for lp in log_players:
            if not lp or lp in seen:
                continue
            seen.add(lp)

            avatar_url, _ = get_player_avatars(lp)

            result.append({
                "display": lp,
                "has_minigame": False,
                "has_kills": kills_map.get(lp, 0) > 0,
                "linked": True,
                "avatar": avatar_url
            })

        result.sort(key=lambda x: (not x["has_kills"], not x["has_minigame"], x["display"].lower()))

        res.send_response(200)
        res.end_cors()
        res.send_header("Content-Type", "application/json")
        res.end_headers()
        res.wfile.write(json.dumps(result).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/register")
def register(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        
        if not username or not password:
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Usuario e senha obrigatorios")
            return
        
        cleaned_user = clean_name(username)
        if not cleaned_user or len(cleaned_user) < 3 or len(cleaned_user) > 20:
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Usuario invalido (3-20 caracteres)")
            return

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT username FROM users WHERE username = ?", (cleaned_user,))
        if c.fetchone():
            conn.close()
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Usuario ja cadastrado")
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
        
        conn.close()
        
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"status": "ok", "auto_linked": linked_player}).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/login")
def login(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        player_name_payload = data.get("player_name", "").strip()
        auth_code_payload = data.get("auth_code", "").strip()
        
        cleaned_user = clean_name(username)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT password_hash, player_name, aim_highscore FROM users WHERE username = ?", (cleaned_user,))
        res_db = c.fetchone()
        
        if not res_db or not verify_password(res_db[0], password):
            conn.close()
            res.send_response(401)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Usuario ou senha incorretos")
            return
        
        player_name = res_db[1]
        aim_highscore = res_db[2]
        
        if not player_name and player_name_payload and auth_code_payload:
            cleaned_player = clean_name(player_name_payload)
            if verify_auth_code(cleaned_player, auth_code_payload):
                c.execute("SELECT username FROM users WHERE player_name = ?", (cleaned_player,))
                already_linked = c.fetchone()
                if not already_linked:
                    c.execute("SELECT avatar_url, avatar_original_url FROM profiles WHERE name = ?", (cleaned_user,))
                    user_profile = c.fetchone()
                    c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_player,))
                    new_exists = c.fetchone()
                    if new_exists:
                        if user_profile and user_profile[0]:
                            c.execute("UPDATE profiles SET avatar_url = ?, avatar_original_url = ? WHERE name = ?", 
                                      (user_profile[0], user_profile[1], cleaned_player))
                            c.execute("DELETE FROM profiles WHERE name = ?", (cleaned_user,))
                    else:
                        c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_user,))
                        if c.fetchone():
                            c.execute("UPDATE profiles SET name = ? WHERE name = ?", (cleaned_player, cleaned_user))
                        else:
                            c.execute("INSERT INTO profiles (name) VALUES (?)", (cleaned_player,))
                            
                    c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_player, cleaned_user))
                    conn.commit()
                    player_name = cleaned_player
        
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
        
        session_token = str(uuid.uuid4())
        c.execute("UPDATE users SET session_token = ? WHERE username = ?", (session_token, cleaned_user))
        conn.commit()
        conn.close()
        
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({
            "status": "ok",
            "username": cleaned_user,
            "player_name": player_name,
            "session_token": session_token,
            "aim_highscore": aim_highscore
        }).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/link-player")
def link_player(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        session_token = data.get("session_token", "").strip()
        player_name = data.get("player_name", "").strip()
        auth_code = data.get("auth_code", "").strip()
        
        cleaned_user = clean_name(username)
        cleaned_player = clean_name(player_name)
        
        if not cleaned_user or not session_token or not cleaned_player or not auth_code:
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Campos obrigatorios faltando")
            return
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT session_token FROM users WHERE username = ?", (cleaned_user,))
        res_db = c.fetchone()
        
        if not res_db or res_db[0] != session_token:
            conn.close()
            res.send_response(401)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Sessao invalida. Faca login novamente.")
            return
        
        c.execute("SELECT username FROM users WHERE player_name = ? AND username != ?", (cleaned_player, cleaned_user))
        claimed = c.fetchone()
        if claimed:
            conn.close()
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Este personagem ja esta vinculado a outra conta")
            return
        
        if verify_auth_code(player_name, auth_code):
            c.execute("UPDATE users SET player_name = ? WHERE username = ?", (cleaned_player, cleaned_user))
            
            c.execute("SELECT avatar_url, avatar_original_url FROM profiles WHERE name = ?", (cleaned_user,))
            user_profile = c.fetchone()
            
            c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_player,))
            new_exists = c.fetchone()
            
            if new_exists:
                if user_profile and user_profile[0]:
                    c.execute("UPDATE profiles SET avatar_url = ?, avatar_original_url = ? WHERE name = ?", 
                              (user_profile[0], user_profile[1], cleaned_player))
                    c.execute("DELETE FROM profiles WHERE name = ?", (cleaned_user,))
            else:
                c.execute("SELECT name FROM profiles WHERE name = ?", (cleaned_user,))
                if c.fetchone():
                    c.execute("UPDATE profiles SET name = ? WHERE name = ?", (cleaned_player, cleaned_user))
                else:
                    c.execute("INSERT INTO profiles (name) VALUES (?)", (cleaned_player,))
                
            conn.commit()
            conn.close()
            
            res.send_response(200)
            res.end_cors()
            res.end_headers()
            res.wfile.write(json.dumps({"status": "ok", "player_name": cleaned_player}).encode("utf-8"))
        else:
            conn.close()
            res.send_response(403)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Codigo de autenticacao invalido ou expirado")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/rename-player")
def rename_player(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        session_token = data.get("session_token", "").strip()
        new_player_name = data.get("new_player_name", "").strip()
        auth_code = data.get("auth_code", "").strip()
        
        cleaned_user = clean_name(username)
        cleaned_new_player = clean_name(new_player_name)
        
        if not cleaned_user or not session_token or not cleaned_new_player or not auth_code:
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Campos obrigatorios faltando")
            return
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT session_token, player_name FROM users WHERE username = ?", (cleaned_user,))
        res_db = c.fetchone()
        
        if not res_db or res_db[0] != session_token:
            conn.close()
            res.send_response(401)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Sessao invalida. Faca login novamente.")
            return
        
        old_player_name = res_db[1]
        if not old_player_name:
            conn.close()
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Voce precisa vincular um personagem primeiro")
            return
        
        c.execute("SELECT username FROM users WHERE player_name = ? AND username != ?", (cleaned_new_player, cleaned_user))
        claimed = c.fetchone()
        if claimed:
            conn.close()
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"O novo nick ja esta vinculado a outra conta")
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
                
                res.send_response(200)
                res.end_cors()
                res.end_headers()
                res.wfile.write(json.dumps({"status": "ok", "player_name": cleaned_new_player}).encode("utf-8"))
            else:
                res.send_response(500)
                res.end_cors()
                res.end_headers()
                res.wfile.write(b"Erro interno ao renomear dados do jogador")
        else:
            conn.close()
            res.send_response(403)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Codigo de autenticacao para o novo nick invalido ou expirado")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/update-highscore")
def update_highscore(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        session_token = data.get("session_token", "").strip()
        highscore = int(data.get("highscore", 0))
        
        cleaned_user = clean_name(username)
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT session_token, aim_highscore FROM users WHERE username = ?", (cleaned_user,))
        res_db = c.fetchone()
        
        if not res_db or res_db[0] != session_token:
            conn.close()
            res.send_response(401)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Sessao expirada.")
            return
        
        current_highscore = res_db[1]
        if highscore > current_highscore:
            c.execute("UPDATE users SET aim_highscore = ? WHERE username = ?", (highscore, cleaned_user))
            conn.commit()
            current_highscore = highscore
        
        conn.close()
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"status": "ok", "aim_highscore": current_highscore}).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/update-minigame-highscore")
def update_minigame_highscore(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        session_token = data.get("session_token", "").strip()
        game_type = data.get("game_type", "").strip()
        highscore = int(data.get("highscore", 0))
        
        if game_type not in ["aim", "reaction", "spray", "fof", "grenade", "termo", "bomb"]:
            res.send_response(400)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Tipo de jogo invalido.")
            return
        
        cleaned_user = clean_name(username)
        col_name = f"{game_type}_highscore"
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute(f"SELECT session_token, {col_name} FROM users WHERE username = ?", (cleaned_user,))
        res_db = c.fetchone()
        
        if not res_db or res_db[0] != session_token:
            conn.close()
            res.send_response(401)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Sessao expirada.")
            return
        
        current_highscore = res_db[1] or 0
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
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(json.dumps({"status": "ok", "highscore": current_highscore, "updated": updated}).encode("utf-8"))
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/claim-profile")
def claim_profile(req, res):
    try:
        data = req["body"]
        name, code = data.get("name"), data.get("code")
        
        if verify_auth_code(name, code):
            res.send_response(200)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"OK")
        else:
            res.send_response(403)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Codigo invalido ou expirado")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/upload-avatar")
def upload_avatar(req, res):
    try:
        data = req["body"]
        name, code, b64_image = data.get("name"), data.get("code"), data.get("image")
        b64_original = data.get("originalImage")
        username = data.get("username")
        session_token = data.get("session_token")
        
        authorized = False
        cleaned_name = clean_name(name) if name else ""
        
        if username and session_token:
            cleaned_user = clean_name(username)
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT session_token, player_name FROM users WHERE LOWER(username) = LOWER(?)", (cleaned_user,))
            res_db = c.fetchone()
            conn.close()
            
            if res_db and res_db[0] == session_token:
                db_player = clean_name(res_db[1]) if res_db[1] else ""
                if db_player and db_player.lower() == cleaned_name.lower():
                    authorized = True
                elif cleaned_user.lower() == cleaned_name.lower():
                    authorized = True
                elif not db_player:
                    authorized = True
        
        if not authorized and code:
            if verify_auth_code(name, code):
                authorized = True
        
        if authorized:
            url = save_avatar(name, b64_image, b64_original)
            if url:
                res.send_response(200)
                res.end_cors()
                res.end_headers()
                res.wfile.write(json.dumps({"url": url}).encode("utf-8"))
            else:
                res.send_response(500)
                res.end_cors()
                res.end_headers()
                res.wfile.write(b"Erro ao processar imagem")
        else:
            res.send_response(403)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Acesso negado: codigo invalido ou sessao expirada")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/auth")
def auth(req, res):
    try:
        data = req["body"]
        user = verify_session_and_get_user(data.get("username"), data.get("session_token"))
        if user:
            res.send_response(200)
            res.end_cors()
            res.end_headers()
            res.wfile.write(json.dumps({
                "status": "ok",
                "username": user["username"],
                "player_name": user["player_name"],
                "aim_highscore": user["aim_highscore"]
            }).encode("utf-8"))
        else:
            res.send_response(401)
            res.end_cors()
            res.end_headers()
            res.wfile.write(b"Invalid session")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))

@router.post("/logout")
def logout(req, res):
    try:
        data = req["body"]
        username = data.get("username", "").strip()
        cleaned_user = clean_name(username)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET session_token = NULL WHERE username = ?", (cleaned_user,))
        conn.commit()
        conn.close()
        res.send_response(200)
        res.end_cors()
        res.end_headers()
        res.wfile.write(b"OK")
    except Exception as e:
        res.send_response(500)
        res.end_cors()
        res.end_headers()
        res.wfile.write(str(e).encode("utf-8"))
