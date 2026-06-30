import os
import re

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
