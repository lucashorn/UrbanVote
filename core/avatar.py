import os
import time
import base64
from core.config import DB_FILE, AVATARS_DIR, clean_name
from core.database import get_db_connection

def get_player_avatar(name):
    try:
        clean = clean_name(name)
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT avatar_url FROM profiles WHERE name = ?", (clean,))
        res = c.fetchone()
        conn.close()
        return res['avatar_url'] if res else None
    except:
        return None

def get_player_avatars(name):
    try:
        clean = clean_name(name)
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT avatar_url, avatar_original_url FROM profiles WHERE name = ?", (clean,))
        res = c.fetchone()
        conn.close()
        if res:
            return res['avatar_url'], res['avatar_original_url']
        return None, None
    except:
        return None, None

def save_avatar(name, b64_cropped, b64_original=None):
    if not b64_cropped: return None
    try:
        clean = clean_name(name)
        
        # Save cropped image
        header, data = b64_cropped.split(",", 1)
        ext = "jpg"
        if "png" in header: ext = "png"
        elif "webp" in header: ext = "webp"
        
        timestamp = int(time.time())
        filename = f"{clean.replace(' ', '_')}_{timestamp}.{ext}"
        filepath = os.path.join(AVATARS_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(data))
        
        url = f"avatars/{filename}"
        
        # Save original image
        original_url = None
        if b64_original:
            orig_header, orig_data = b64_original.split(",", 1)
            orig_ext = "jpg"
            if "png" in orig_header: orig_ext = "png"
            elif "webp" in orig_header: orig_ext = "webp"
            
            orig_filename = f"{clean.replace(' ', '_')}_{timestamp}_orig.{orig_ext}"
            orig_filepath = os.path.join(AVATARS_DIR, orig_filename)
            
            with open(orig_filepath, "wb") as f:
                f.write(base64.b64decode(orig_data))
            
            original_url = f"avatars/{orig_filename}"
            
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO profiles (name, avatar_url, avatar_original_url) 
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET 
                avatar_url = excluded.avatar_url,
                avatar_original_url = excluded.avatar_original_url
        """, (clean, url, original_url))
        conn.commit()
        conn.close()
        return url
    except Exception as e:
        print(f"Error saving avatar: {e}")
        return None
