import socket
import re
import os

from server.config import INITIAL_PARSE_DONE

WEAPONS_MAP = {
    "F": "Beretta", "G": "DEagle", "f": "Glock", "g": "Colt1911", "l": "Magnum",
    "I": "MP5K", "J": "UMP45", "h": "MAC11", "k": "P90", "c": "Negev",
    "L": "LR300", "M": "G36", "a": "AK103", "e": "M4A1",
    "N": "PSG-1", "Z": "SR8", "i": "FRF1",
    "H": "SPAS12", "j": "Benelli", "K": "HK69",
    "O": "HE-Gren", "Q": "Smoke"
}
OFFICIAL_GEAR_SEQUENCE = "FGHIJKLMNZacefghijklOQRSTUVWX"

def decode_gear(gear_str):
    gear_str = gear_str.replace('"', '').strip()
    if gear_str == "0" or not gear_str:
        return "Todas liberadas"
    
    allowed = []
    for letter in OFFICIAL_GEAR_SEQUENCE:
        if letter not in gear_str and letter in WEAPONS_MAP:
            allowed.append(letter)
            
    profiles = {
        "Somente Pistola": set("FGfgl"),
        "Somente Sniper": set("NZi"),
        "Somente Shotgun": set("Hj"),
        "Somente Granada": set("KOQ"),
        "Somente Faca/Kevlar": set("")
    }
    
    allowed_set = set(allowed)
    for name, p_set in profiles.items():
        if allowed_set == p_set:
            return name
            
    if not allowed:
        return "Somente Faca/Kevlar"
    
    allowed_names = [WEAPONS_MAP[l] for l in allowed]
    
    if len(allowed_names) > 8:
        return "Quase todas (veja menu)"
        
    return ", ".join(allowed_names)

def get_default_limits():
    timelimit = 5
    fraglimit = 10
    cfg_path = "/home/lucas/Documentos/urbanterror43/q3ut4/server.cfg"
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                content = f.read()
            m_time = re.search(r'(?m)^(\s*set\s+)?timelimit\s+"?(\d+)"?', content)
            m_frag = re.search(r'(?m)^(\s*set\s+)?fraglimit\s+"?(\d+)"?', content)
            if m_time:
                timelimit = int(m_time.group(2))
            if m_frag:
                fraglimit = int(m_frag.group(2))
        except Exception as e:
            print("Erro ao ler limites do server.cfg:", e)
    return timelimit, fraglimit

def send_rcon(command):
    # Nota: Em um módulo dividido, INITIAL_PARSE_DONE de config pode não ser mutável globalmente
    # se re-importado como variável simples. A lógica real deve ser verificada em runtime ou injetada.
    import server.config
    if not server.config.INITIAL_PARSE_DONE:
        return
    password = "coco"
    ip = "127.0.0.1"
    port = 27960
    prefix = b'\xff\xff\xff\xff'
    payload = f"rcon {password} {command}".encode('utf-8')
    packet = prefix + payload
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(0.5)
            sock.sendto(packet, (ip, port))
    except Exception:
        pass

def send_rcon_sync(command):
    import server.config
    if not server.config.INITIAL_PARSE_DONE:
        return ""
    password = "coco"
    ip = "127.0.0.1"
    port = 27960
    prefix = b'\xff\xff\xff\xff'
    payload = f"rcon {password} {command}".encode('utf-8')
    packet = prefix + payload
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(1.0)
            sock.sendto(packet, (ip, port))
            data, _ = sock.recvfrom(4096)
            return data.decode('utf-8', errors='replace').replace('\xff\xff\xff\xffprint\n', '')
    except Exception:
        return ""
