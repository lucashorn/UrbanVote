import json

with open("kills_stats.json", "r") as f:
    stats = json.load(f)

for period in ["all", "daily"]:
    print(f"\n--- {period} ---")
    locs = stats[period].get("hit_locations", {})
    for p in ["Netanyahu", "acheifacil", "sig"]:
        print(f"{p}: {locs.get(p, {})}")
