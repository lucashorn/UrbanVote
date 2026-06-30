// ─── Config / Global Constants ───────────────────────────────────────────────
const API_URL = "http://192.168.128.102:8085";

const STORAGE_KEY = "urban_votes";
const DATE_KEY    = "urban_vote_date";

const maps = [
    "ut4_abbey", "ut4_algiers",
    "ut4_austria", "ut4_bohemia", "ut4_casa", "ut4_cascade", "ut4_docks",
    "ut4_dressingroom", "ut4_eagle", "ut4_firingrange", "ut4_elgin", "ut4_ghosttown",
    "ut4_herring", "ut4_killroom", "ut4_kingdom", "ut4_kingpin",
    "ut4_mandolin", "ut4_mykonos_a17", "ut4_oildepot", "ut4_paris", "ut4_prague", "ut4_prominence",
    "ut4_raiders", "ut4_ramelle", "ut4_ricochet", "ut4_riyadh",
    "ut4_sanc", "ut4_suburbs", "ut4_subway",
    "ut4_swim", "ut4_thingley", "ut4_tombs",
    "ut4_turnpike", "ut4_uptown"
];

const modeNames = {
    1: "LMS - Last Man Standing",
    2: "FFA - Free for All",
    3: "TDM - Team Deathmatch",
    4: "TS - Team Survivor",
    5: "FTL - Follow the Leader",
    6: "CNH - Capture & Hold",
    7: "CTF - Capture the Flag",
    8: "BM - Bomb & Defuse",
    9: "JUMP - Jump Mode",
    10: "FT - Freeze Tag",
    11: "GUN - Gun Game"
};

const mapImages = {
    "ut4_abbey": "Abbey.jpg",
    "ut4_algiers": "Algiers.jpg",
    "ut4_austria": "Austria.jpg",
    "ut4_bohemia": "Bohemia.jpg",
    "ut4_casa": "Casa.jpg",
    "ut4_cascade": "Cascade.jpg",
    "ut4_docks": "Docks.jpg",
    "ut4_dressingroom": "Dressingroom.jpg",
    "ut4_eagle": "Eagle.jpg",
    "ut4_firingrange": "Firingrange.jpg",
    "ut4_elgin": "Elgin.jpg",
    "ut4_herring": "Herring.jpg",
    "ut4_ghosttown": "Ghosttown.jpg",
    "ut4_killroom": "Killroom.jpg",
    "ut4_kingdom": "Kingdom.jpg",
    "ut4_kingpin": "Kingpin.jpg",
    "ut4_mandolin": "Mandolin.jpg",
    "ut4_mykonos_a17": "Mykonos.jpg",
    "ut4_oildepot": "Oildepot.jpg",
    "ut4_paris": "Paris.jpg",
    "ut4_prague": "Prague.jpg",
    "ut4_prominence": "Prominence.jpg",
    "ut4_raiders": "Raiders.jpg",
    "ut4_ramelle": "Ramelle.jpg",
    "ut4_ricochet": "Ricochet.jpg",
    "ut4_riyadh": "Riyadh.jpg",
    "ut4_sanc": "Sanc.jpg",
    "ut4_suburbs": "Suburbs.jpg",
    "ut4_subway": "Subway.jpg",
    "ut4_swim": "Swim.jpg",
    "ut4_thingley": "Thingley.jpg",
    "ut4_tombs": "Tombs.jpg",
    "ut4_turnpike": "Turnpike.jpg",
    "ut4_uptown": "Uptown.jpg"
};

const weaponImages = {
    "Beretta": "beretta", "Beretta 92FS": "beretta", "BERETTA": "beretta",
    "Desert Eagle": "deagle", ".50 Desert Eagle": "deagle", "DEAGLE": "deagle",
    "SPAS": "spas12", "SPAS 12": "spas12", "Franchi SPAS-12": "spas12", "SPAS-12": "spas12",
    "MP5K": "mp5k", "H&K MP5K": "mp5k",
    "UMP45": "ump45", "H&K UMP 45": "ump45", "UMP 45": "ump45",
    "HK69": "hk69", "H&K 69": "hk69", "H&K69": "hk69",
    "LR300": "lr300", "LR300ML": "lr300", "ZM LR 300": "lr300", "ZM LR300": "lr300",
    "G36": "g36", "H&K G-36": "g36", "H&K G36": "g36",
    "PSG-1": "psg1", "PSG1": "psg1", "6. PSG-1": "psg1",
    "HE Grenade": "hegrenade", "HEGRENADE": "hegrenade",
    "Knife": "knife",
    "Smoke Grenade": "smokegrenade",
    "Kevlar Vest": "vest",
    "Goggles": "goggles",
    "Medkit": "medkit",
    "Silencer": "silencer",
    "Laser": "laser", "Laser Sight": "laser",
    "Helmet": "helmet",
    "Extra Ammo": "extraammo",
    "SR8": "sr8", "SR-8": "sr8",
    "AK-103": "ak103", "AK 103": "ak103", "AK103": "ak103",
    "Negev": "negev", "Negev LMG": "negev", "IMI NEGEV": "negev",
    "M4A1": "m4a1", "Colt M4A1": "m4a1", "M4": "m4a1", "m4": "m4a1",
    "Glock": "glock", "GLOCK": "glock",
    "Colt 1911": "colt1911", "COLT1911": "colt1911",
    "MAC11": "mac11", "MAC 11": "mac11",
    "FRF1": "frf1", "FR-F1": "frf1",
    "Benelli": "benelli", "Benelli M4": "benelli", "BENELLI": "benelli",
    "P90": "p90", "FN P90": "p90",
    "Magnum": "magnum", "MAGNUM": "magnum",
    "KNIFE": "knife", "KNIFE_THROWN": "knife", "BLED": "medkit"
};

const customWeaponGroups = {
    "Pistolas": {
        "F": "Beretta 92FS",
        "G": ".50 Desert Eagle",
        "f": "Glock",
        "g": "Colt 1911",
        "l": "Magnum"
    },
    "Submetralhadoras & LMG": {
        "I": "MP5K",
        "J": "UMP45",
        "h": "MAC11",
        "k": "P90",
        "c": "Negev LMG"
    },
    "Fuzis de Assalto": {
        "L": "LR300ML",
        "M": "G36",
        "a": "AK-103",
        "e": "Colt M4A1"
    },
    "Snipers": {
        "N": "PSG-1",
        "Z": "SR8",
        "i": "FRF1"
    },
    "Shotguns & Explosivos": {
        "H": "SPAS 12",
        "j": "Benelli",
        "K": "HK69"
    },
    "Granadas": {
        "O": "HE Grenade",
        "Q": "Smoke Grenade"
    },
    "Itens / Equipamentos": {
        "R": "Kevlar Vest",
        "W": "Helmet",
        "T": "Medkit",
        "X": "Extra Ammo",
        "U": "Silencer",
        "V": "Laser Sight",
        "S": "Goggles"
    }
};

const OFFICIAL_GEAR_ORDER = "FGHIJKLMNZacefghijklOQRSTUVWX";

const customWeaponMapping = {};
Object.values(customWeaponGroups).forEach(group => Object.assign(customWeaponMapping, group));

const ACHIEVEMENTS_METADATA = {
    "kills": { name: "Exterminador", description: "Eliminações no total. Cada nível dobra o objetivo anterior.", icon: "fas fa-crosshairs" },
    "deaths": { name: "Saco de Pancadas", description: "Mortes no total. Cada nível dobra o objetivo anterior.", icon: "fas fa-skull" },
    "matches": { name: "Veterano", description: "Partidas completadas. Cada nível dobra o objetivo anterior.", icon: "fas fa-gamepad" },
    "mvp": { name: "Destaque", description: "Vezes sendo o MVP da partida. Cada nível dobra o objetivo anterior.", icon: "fas fa-award" },
    "triple_kills": { name: "Multi-kill", description: "Vezes que matou 3 inimigos sem morrer (Triple Kill). Cada nível dobra o objetivo anterior.", icon: "fas fa-fire-flame-curved" },
    "max_streak": { name: "Imbatível", description: "Sequência de eliminações sem morrer. Cada nível dobra o objetivo anterior.", icon: "fas fa-bolt" },
    "headshots": { name: "Atirador de Elite", description: "Eliminações com tiros na cabeça (Headshot). Cada nível dobra o objetivo anterior.", icon: "fas fa-bullseye" },
    "hs_ratio": { name: "Mira Perfeita", description: "Porcentagem de tiros na cabeça (mínimo 50 acertos). Cada nível exige +10% de precisão.", icon: "fas fa-crosshairs" },
    "weapon_sniper": { name: "Olho de Águia", description: "Eliminações com Rifles Sniper (PSG1, SR8, FRF1). Cada nível dobra o objetivo anterior.", icon: "fas fa-crosshairs" },
    "weapon_pistol": { name: "Pistoleiro", description: "Eliminações com Pistolas. Cada nível dobra o objetivo anterior.", icon: "fas fa-gun" },
    "weapon_auto": { name: "Rambo", description: "Eliminações com Armas Automáticas. Cada nível dobra o objetivo anterior.", icon: "fas fa-shield-halved" },
    "weapon_shotgun": { name: "Impacto Próximo", description: "Eliminações com Escopetas (SPAS, Benelli). Cada nível dobra o objetivo anterior.", icon: "fas fa-bullseye" },
    "weapon_grenade": { name: "Mestre da Explosão", description: "Eliminações com Granadas (HE, HK69). Cada nível dobra o objetivo anterior.", icon: "fas fa-bomb" },
    "weapon_knife": { name: "Assassino Furtivo", description: "Eliminações com a Faca (Knife). Cada nível dobra o objetivo anterior.", icon: "fas fa-skull" },
    "knife_thrown": { name: "Cirúrgico", description: "Eliminações arremessando a faca. Cada nível dobra o objetivo anterior.", icon: "fas fa-bolt" },
    "kd_elite": { name: "Soldado de Elite", description: "Mantenha um K/D alto (mínimo 100 kills). Cada nível dobra o K/D exigido.", icon: "fas fa-shield-halved" },
    "unbeatable": { name: "Massacre", description: "Eliminações em uma única partida. Cada nível dobra o objetivo anterior.", icon: "fas fa-fire-flame-curved" },
    "nemesis_hunter": { name: "Caçador de Nêmesis", description: "Elimine o mesmo jogador 100 vezes. Cada nível dobra o objetivo anterior.", icon: "fas fa-user-ninja" },
    "victim_collector": { name: "Colecionador de Almas", description: "Elimine diferentes jogadores. Cada nível dobra a quantidade exigida.", icon: "fas fa-people-group" },
    "completionist": { name: "Perfeccionista", description: "Desbloqueie e atinja o mesmo nível em TODAS as outras 19 conquistas.", icon: "fas fa-crown" }
};

const ZONE_META = {
    head:  { label: "Cabeça", color: "#ff2222" },
    torso: { label: "Tronco", color: "#ff7700" },
    arms:  { label: "Braços", color: "#ffcc00" },
    legs:  { label: "Pernas", color: "#22dd88" }
};
