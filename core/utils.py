import os
import json
from datetime import datetime
from core.config import VOTES_FILE

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
