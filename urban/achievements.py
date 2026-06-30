import math
from core.config import clean_name
from urban.stats import global_stats, cached_match_stats, cached_match_stats_lock
from urban.rcon import send_rcon

def int_to_roman(num):
    if num <= 0:
        return ""
    val = [
        1000, 900, 500, 400,
        100, 90, 50, 40,
        10, 9, 5, 4,
        1
    ]
    syb = [
        "M", "CM", "D", "CD",
        "C", "XC", "L", "XL",
        "X", "IX", "V", "IV",
        "I"
    ]
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syb[i]
            num -= val[i]
        i += 1
    return roman_num

def calc_infinite_achievement(value, base):
    if base <= 0:
        return {"unlocked": False, "level": 0, "roman": "", "current": value, "target": base}
    if value < base:
        return {
            "unlocked": False,
            "level": 0,
            "roman": "",
            "current": value,
            "target": base
        }
    level = 1 + int(math.log2(value / base))
    next_target = base * (2 ** level)
    return {
        "unlocked": True,
        "level": level,
        "roman": int_to_roman(level),
        "current": value,
        "target": next_target
    }

def check_achievements(player, stats_all, player_match_stats):
    baselines = global_stats.get("baselines", {}).get(player, {})
    
    kills = max(0, stats_all.get("kills", {}).get(player, 0) - baselines.get("kills", 0))
    deaths = max(0, stats_all.get("deaths", {}).get(player, 0) - baselines.get("deaths", 0))
    kd = kills / deaths if deaths > 0 else kills
    
    weapons = stats_all.get("weapons", {}).get(player, {})
    b_sniper = baselines.get("sniper_kills", 0)
    b_pistol = baselines.get("pistol_kills", 0)
    b_auto = baselines.get("auto_kills", 0)
    b_shotgun = baselines.get("shotgun_kills", 0)
    b_grenade = baselines.get("grenade_kills", 0)
    b_knife = baselines.get("knife_kills", 0)
    b_knife_thrown = baselines.get("knife_thrown_kills", 0)
    
    sniper_kills = max(0, weapons.get("UT_MOD_PSG1", 0) + weapons.get("UT_MOD_SR8", 0) + weapons.get("UT_MOD_FRF1", 0) - b_sniper)
    pistol_kills = max(0, (weapons.get("UT_MOD_BERETTA", 0) + weapons.get("UT_MOD_DEAGLE", 0) + 
                          weapons.get("UT_MOD_GLOCK", 0) + weapons.get("UT_MOD_COLT1911", 0) + 
                          weapons.get("UT_MOD_MAGNUM", 0)) - b_pistol)
    auto_kills = max(0, (weapons.get("UT_MOD_AK103", 0) + weapons.get("UT_MOD_LR300", 0) + 
                        weapons.get("UT_MOD_G36", 0) + weapons.get("UT_MOD_M4", 0) + 
                        weapons.get("UT_MOD_NEGEV", 0) + weapons.get("UT_MOD_MP5K", 0) + 
                        weapons.get("UT_MOD_UMP45", 0) + weapons.get("UT_MOD_MAC11", 0) + 
                        weapons.get("UT_MOD_P90", 0)) - b_auto)
    shotgun_kills = max(0, weapons.get("UT_MOD_SPAS", 0) + weapons.get("UT_MOD_BENELLI", 0) - b_shotgun)
    grenade_kills = max(0, weapons.get("UT_MOD_HEGRENADE", 0) + weapons.get("UT_MOD_HK69", 0) + weapons.get("UT_MOD_HK69_HIT", 0) - b_grenade)
    knife_kills = max(0, weapons.get("UT_MOD_KNIFE", 0) + weapons.get("UT_MOD_KNIFE_THROWN", 0) + weapons.get("UT_MOD_BLED", 0) - b_knife)
    knife_thrown_kills = max(0, weapons.get("UT_MOD_KNIFE_THROWN", 0) - b_knife_thrown)
    
    relationships = stats_all.get("relationships", {}).get(player, {})
    max_kills_single_victim = max(relationships.values()) if relationships else 0
    max_kills_single_victim = max(0, max_kills_single_victim - baselines.get("max_kills_single_victim", 0))
    victim_collector_val = max(0, len(relationships) - baselines.get("relationships_count", 0))
    
    matches_played = max(0, player_match_stats.get("matches", 0) - baselines.get("matches", 0))
    mvps = max(0, player_match_stats.get("mvps", 0) - baselines.get("mvps", 0))
    max_kills_in_match = max(0, player_match_stats.get("max_kills", 0) - baselines.get("max_kills_in_match", 0))
    
    triple_kills = max(0, stats_all.get("triple_kills", {}).get(player, 0) - baselines.get("triple_kills", 0))
    max_streak = max(0, stats_all.get("max_streak", {}).get(player, 0) - baselines.get("max_streak", 0))
    hits = max(0, stats_all.get("hits", {}).get(player, 0) - baselines.get("hits", 0))
    headshots = max(0, stats_all.get("headshots", {}).get(player, 0) - baselines.get("headshots", 0))
    hs_ratio = (headshots / hits) * 100.0 if hits >= 50 else 0.0
    
    if hits < 50 or hs_ratio < 20.0:
        hs_ach = {"unlocked": False, "level": 0, "roman": "", "current": round(hs_ratio, 1), "target": 20.0}
    else:
        hs_lvl = min(int((hs_ratio - 20) / 10) + 1, 9)
        hs_ach = {
            "unlocked": True,
            "level": hs_lvl,
            "roman": int_to_roman(hs_lvl),
            "current": round(hs_ratio, 1),
            "target": min(20.0 + hs_lvl * 10.0, 100.0)
        }
        
    if kills < 100 or kd < 1.5:
        kd_ach = {"unlocked": False, "level": 0, "roman": "", "current": round(kd, 2) if kills >= 100 else 0, "target": 1.5}
    else:
        kd_lvl = 1 + int(math.log2(kd / 1.5))
        kd_ach = {
            "unlocked": True,
            "level": kd_lvl,
            "roman": int_to_roman(kd_lvl),
            "current": round(kd, 2),
            "target": round(1.5 * (2 ** kd_lvl), 2)
        }

    achievements = {
        "kills": calc_infinite_achievement(kills, 100),
        "deaths": calc_infinite_achievement(deaths, 100),
        "matches": calc_infinite_achievement(matches_played, 10),
        "mvp": calc_infinite_achievement(mvps, 5),
        "triple_kills": calc_infinite_achievement(triple_kills, 5),
        "max_streak": calc_infinite_achievement(max_streak, 5),
        "headshots": calc_infinite_achievement(headshots, 25),
        "hs_ratio": hs_ach,
        "weapon_sniper": calc_infinite_achievement(sniper_kills, 100),
        "weapon_pistol": calc_infinite_achievement(pistol_kills, 100),
        "weapon_auto": calc_infinite_achievement(auto_kills, 100),
        "weapon_shotgun": calc_infinite_achievement(shotgun_kills, 50),
        "weapon_grenade": calc_infinite_achievement(grenade_kills, 20),
        "weapon_knife": calc_infinite_achievement(knife_kills, 20),
        "knife_thrown": calc_infinite_achievement(knife_thrown_kills, 1),
        "kd_elite": kd_ach,
        "unbeatable": calc_infinite_achievement(max_kills_in_match, 30),
        "nemesis_hunter": calc_infinite_achievement(max_kills_single_victim, 100),
        "victim_collector": calc_infinite_achievement(victim_collector_val, 5)
    }

    other_lvls = [ach["level"] for ach in achievements.values()]
    min_lvl = min(other_lvls) if other_lvls else 0
    if min_lvl == 0:
        completionist_ach = {
            "unlocked": False,
            "level": 0,
            "roman": "",
            "current": 0,
            "target": 1
        }
    else:
        completionist_ach = {
            "unlocked": True,
            "level": min_lvl,
            "roman": int_to_roman(min_lvl),
            "current": min_lvl,
            "target": min_lvl + 1
        }

    achievements["completionist"] = completionist_ach
    return achievements

def get_achievements_levels(all_players, stats_all, cached_stats):
    player_levels = {}
    for player in all_players:
        player_clean = clean_name(player)
        player_m_stats = cached_stats.get(player_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
        ach_results = check_achievements(player_clean, stats_all, player_m_stats)
        player_levels[player_clean] = {ach_id: info["level"] for ach_id, info in ach_results.items()}
    return player_levels

ACHIEVEMENTS_NAMES = {
    "kills": "Exterminador",
    "deaths": "Saco de Pancadas",
    "matches": "Veterano",
    "mvp": "Destaque",
    "triple_kills": "Multi-kill",
    "max_streak": "Imbatível",
    "headshots": "Atirador de Elite",
    "hs_ratio": "Mira Perfeita",
    "weapon_sniper": "Olho de Águia",
    "weapon_pistol": "Pistoleiro",
    "weapon_auto": "Rambo",
    "weapon_shotgun": "Impacto Próximo",
    "weapon_grenade": "Mestre da Explosão",
    "weapon_knife": "Assassino Furtivo",
    "knife_thrown": "Cirúrgico",
    "kd_elite": "Soldado de Elite",
    "unbeatable": "Massacre",
    "nemesis_hunter": "Caçador de Nêmesis",
    "victim_collector": "Colecionador de Almas",
    "completionist": "Perfeccionista"
}

def update_and_check_achievement(player, update_fn):
    player_clean = clean_name(player)
    with cached_match_stats_lock:
        p_m_stats = cached_match_stats.get(player_clean, {"matches": 0, "mvps": 0, "max_kills": 0})
    
    ach_before = check_achievements(player_clean, global_stats["all"], p_m_stats)
    
    update_fn()
    
    ach_after = check_achievements(player_clean, global_stats["all"], p_m_stats)
    
    for ach_id, info_after in ach_after.items():
        info_before = ach_before.get(ach_id, {"level": 0})
        if info_after["level"] > info_before["level"]:
            lvl = info_after["level"]
            roman = info_after["roman"]
            
            all_players = set(global_stats["all"].get("kills", {}).keys()) | set(global_stats["all"].get("deaths", {}).keys())
            player_levels = get_achievements_levels(all_players, global_stats["all"], cached_match_stats)
            count = sum(1 for p in player_levels.values() if p.get(ach_id, 0) >= lvl)
            pct = round((count / len(all_players)) * 100, 1) if all_players else 100.0
            
            if pct < 5.0:
                color = "^3"
                rarity_name = "Lendaria"
            elif pct < 20.0:
                color = "^6"
                rarity_name = "Epica"
            elif pct < 50.0:
                color = "^5"
                rarity_name = "Rara"
            else:
                color = "^7"
                rarity_name = "Comum"
                
            ach_name = ACHIEVEMENTS_NAMES.get(ach_id, ach_id)
            msg = f'say "^2{player} ^7conquistou {color}{ach_name} {roman} ^7({pct}% - {rarity_name})"'
            send_rcon(msg)
