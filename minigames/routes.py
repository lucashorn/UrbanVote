import json
import random
from core.router import router
from minigames.termo import TERMO_WORDS

@router.get("/random-word")
def random_word(req, res):
    word = random.choice(list(TERMO_WORDS)) if TERMO_WORDS else "BOMBA"
    res.send_response(200)
    res.end_cors()
    res.send_header("Content-Type", "application/json")
    res.end_headers()
    res.wfile.write(json.dumps({"word": word}).encode("utf-8"))
