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

print("Arm hits:")
for p, count in sorted(arm_hits.items(), key=lambda x: x[1], reverse=True):
    print(f"  {p}: {count}")

print("Leg hits:")
for p, count in sorted(leg_hits.items(), key=lambda x: x[1], reverse=True):
    print(f"  {p}: {count}")
