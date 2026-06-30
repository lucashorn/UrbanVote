import os
import urllib.request
import unicodedata
from core.config import BASE_DIR

WORDS_5_FILE = os.path.join(BASE_DIR, "words_5.txt")

def load_or_download_words():
    if os.path.exists(WORDS_5_FILE):
        try:
            with open(WORDS_5_FILE, "r", encoding="utf-8") as f:
                words = set(line.strip().upper() for line in f if line.strip())
                if words:
                    print(f"Dicionario carregado do cache local com {len(words)} palavras.")
                    return words
        except Exception as e:
            print(f"Erro ao ler cache local de palavras: {e}")
            
    try:
        url = "https://raw.githubusercontent.com/fserb/pt-br/master/lexico"
        print("Baixando dicionario de fserb/pt-br...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read().decode('utf-8')
        
        words_5 = set()
        for line in content.splitlines():
            word = line.strip()
            if not word:
                continue
            nfkd_form = unicodedata.normalize('NFKD', word)
            normalized = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
            if len(normalized) == 5 and normalized.isalpha():
                words_5.add(normalized.upper())
                
        if words_5:
            with open(WORDS_5_FILE, "w", encoding="utf-8") as f:
                for w in sorted(words_5):
                    f.write(w + "\n")
            print(f"Dicionario baixado e salvo com {len(words_5)} palavras de 5 letras.")
            return words_5
    except Exception as e:
        print(f"Erro ao baixar dicionario pt-BR: {e}. Usando fallback.")
        
    fallback = {
        "BOMBA", "SLIDE", "MEDIC", "LASER", "SMOKE", 
        "ABBEY", "PARIS", "RADIO", "JUMPS", "SHOTS", 
        "ARMAS", "RIVAL", "PLACA", "KILLS", "DEATH", 
        "ADMIN", "VOTOS", "SOUND", "FOGO", "TERRA", 
        "AMIGO", "TEMPO", "CORPO", "JOGOS", "GRUPO", 
        "PRETO", "FORTE", "SIGLA", "PODER", "UNIAO", 
        "CAMPO", "ROUND", "CLUBE", "ARENA", "URBAN",
        "PORTA", "PEDRA", "CHAVE", "LINHA", "PONTO",
        "GOLPE", "SANGU", "MURAL", "FAROL", "PULSO"
    }
    return fallback

TERMO_WORDS = load_or_download_words()
