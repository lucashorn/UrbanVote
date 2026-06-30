import sqlite3
from core.config import DB_FILE

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS profiles
                 (name TEXT PRIMARY KEY, avatar_url TEXT, auth_code TEXT, auth_expiry DATETIME, avatar_original_url TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS matches
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, map TEXT, date TEXT, mvp TEXT, kills INTEGER, scoreboard TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY, password_hash TEXT, player_name TEXT, session_token TEXT, 
                  aim_highscore INTEGER DEFAULT 0, reaction_highscore INTEGER DEFAULT 0, 
                  spray_highscore INTEGER DEFAULT 0, fof_highscore INTEGER DEFAULT 0,
                  grenade_highscore INTEGER DEFAULT 0)''')
    
    # Migrations
    migrations = [
        "ALTER TABLE matches ADD COLUMN duration REAL DEFAULT 0.0;",
        "ALTER TABLE users ADD COLUMN aim_highscore INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN reaction_highscore INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN spray_highscore INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN fof_highscore INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN grenade_highscore INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN termo_highscore INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN bomb_highscore INTEGER DEFAULT 0;"
    ]
    
    for migration in migrations:
        try:
            c.execute(migration)
        except Exception:
            pass

    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn
