import os
import hashlib
import sqlite3
from datetime import datetime
from core.config import DB_FILE
from core.database import get_db_connection

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

def set_auth_code(name, code):
    from core.config import clean_name
    clean = clean_name(name)
    conn = get_db_connection()
    c = conn.cursor()
    expiry = datetime.now().timestamp() + 600
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
    from core.config import clean_name
    clean = clean_name(name)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT auth_code FROM profiles WHERE name = ?", (clean,))
    res = c.fetchone()
    conn.close()
    
    print(f"[DEBUG] Auth attempt: name='{name}', clean='{clean}', code='{code}'")
    if res:
        saved_code = res['auth_code']
        print(f"[DEBUG] DB record: saved_code='{saved_code}'")
        if str(saved_code) == str(code):
            return True
        else:
            print(f"[DEBUG] Validation failed: code mismatch")
    else:
        print(f"[DEBUG] No record found for '{clean}'")
    return False

def verify_session_and_get_user(username, session_token):
    from core.config import clean_name
    if not username or not session_token:
        return None
    clean = clean_name(username)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT username, player_name, aim_highscore, session_token FROM users WHERE username = ?", (clean,))
    res = c.fetchone()
    conn.close()
    if res and res["session_token"] == session_token:
        return {
            "username": res["username"],
            "player_name": res["player_name"],
            "aim_highscore": res["aim_highscore"]
        }
    return None

