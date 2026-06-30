import json
import re
from collections import defaultdict

arm_hits = defaultdict(int)
leg_hits = defaultdict(int)

hit_re = re.compile(r"Hit:\s+\d+\s+\d+\s+\d+\s+\d+:\s+(.+?)\s+hit\s+(.+?)\s+in\s+the\s+(.+)")

with open("/home/lucas/urbanterror43/q3ut4/games.log", "r", encoding="utf-8", errors="replace") as f:
    for line in f:
        m = hit_re.search(line)
        if m:
            attacker = m.group(1)
            loc = m.group(3).strip().lower()
            if loc in ("arm", "arms", "leftarm", "rightarm", "left_arm", "right_arm", "left arm", "right arm"):
                arm_hits[attacker] += 1
            elif loc in ("leg", "legs", "leftleg", "rightleg", "left_leg", "right_leg", "foot", "feet", "left leg", "right leg"):
                leg_hits[attacker] += 1

with open("kills_stats.json", "r") as f:
    stats = json.load(f)

for period in ["all", "daily"]:
    locs = stats[period].get("hit_locations", {})
    for p, count in arm_hits.items():
        if p in locs:
            if locs[p].get("arms", 0) == 0:  # Only do this if they haven't been fixed yet
                locs[p]["arms"] = locs[p].get("arms", 0) + count
                locs[p]["torso"] = max(0, locs[p].get("torso", 0) - count)
    
    for p, count in leg_hits.items():
        if p in locs:
            if locs[p].get("legs", 0) == 0:
                locs[p]["legs"] = locs[p].get("legs", 0) + count
                locs[p]["torso"] = max(0, locs[p].get("torso", 0) - count)

with open("kills_stats.json", "w") as f:
    json.dump(stats, f, indent=4)

print("Fixed stats for:", arm_hits, leg_hits)
