#!/bin/bash

# =========================================================================
# SCRIPT DE INICIALIZAÇÃO DO SERVIDOR DE CS:S PELO PAINEL WEB
# Onde colocar: Na raiz da pasta do seu servidor (ex: /var/docker/css-server/)
# Permissão: Lembre-se de rodar 'chmod +x start_css_server.sh' após criar
# =========================================================================

# 1. Encerra qualquer processo antigo do servidor que tenha ficado aberto
killall -q srcds_linux
killall -q srcds_run

# 2. Pega um mapa aleatório do seu mapcycle.txt (Ajuste o caminho se necessário)
MAP=$(shuf -n 1 /var/docker/css-server/server/cstrike/mapcycle.txt)

# 3. Entra na pasta onde estão os binários do jogo (srcds_run)
cd /var/docker/css-server/server

# 4. Inicia o servidor em segundo plano (nohup)
# Argumentos: 
#   -game cstrike (jogo CS:S)
#   -console -usercon (habilita RCON e console)
#   +maxplayers 14 (limite de jogadores)
#   +map "$MAP" (mapa inicial)
#   -port 27015 (porta de rede)
nohup ./srcds_run -game cstrike -console -usercon +maxplayers 14 +map "$MAP" -port 27015 > server.log 2>&1 &
