# Guia de Configuração do Servidor de Counter-Strike: Source

Este documento explica o passo a passo para criar o servidor dedicado de CS:S do zero, instalar mods essenciais (MetaMod/SourceMod/WarMod) e integrá-lo ao painel web GamePortal.

---

## 1. Instalação do SteamCMD e do Jogo (SRCDS)

O `SteamCMD` é a ferramenta oficial da Valve para baixar servidores dedicados.

### Instalando dependências no Linux (Debian/Ubuntu):
```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install lib32gcc-s1 lib32stdc++6 curl wget
```

### Baixando o SteamCMD e instalando o CS:S:
```bash
# Crie a pasta do servidor
mkdir -p /var/docker/css-server/steamcmd
cd /var/docker/css-server/steamcmd

# Baixe e extraia o SteamCMD
curl -sqL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" | tar zxvf -

# Baixe os arquivos do servidor de CS:S (App ID 232330)
# Os arquivos do jogo ficarão na subpasta "server"
./steamcmd.sh +force_install_dir ../server +login anonymous +app_update 232330 validate +quit
```

Após o término do download, os arquivos estarão em `/var/docker/css-server/server`.
A subpasta `server/cstrike` contém todos os arquivos do jogo (mapas, binários, configurações).

> [!WARNING]
> **Controle de Versão (Git):** A pasta `cstrike` (criada pelo SteamCMD) pesa vários gigabytes e contém arquivos proprietários da Valve. **NUNCA commite essa pasta inteira em repositórios públicos**. O nosso `.gitignore` já está configurado para ignorá-la.

---

## 2. Instalando Mods (MetaMod e SourceMod)

Para rodar campeonatos (como o WarMod), você precisa da base de plugins `MetaMod:Source` e `SourceMod`.

1. Acesse o site oficial do MetaMod (https://www.metamodsource.net/downloads.php) e do SourceMod (https://www.sourcemod.net/downloads.php) e copie o link da versão para Linux.
2. Extraia ambos dentro da pasta `cstrike` do servidor:

```bash
cd /var/docker/css-server/server/cstrike

# Baixando e extraindo MetaMod (Exemplo de versão)
wget https://mms.alliedmods.net/mmsdrop/1.11/mmsource-1.11.0-git1148-linux.tar.gz
tar -xvzf mmsource-*-linux.tar.gz
rm mmsource-*-linux.tar.gz

# Baixando e extraindo SourceMod (Exemplo de versão)
wget https://sm.alliedmods.net/smdrop/1.11/sourcemod-1.11.0-git6934-linux.tar.gz
tar -xvzf sourcemod-*-linux.tar.gz
rm sourcemod-*-linux.tar.gz
```

*Nota:* Ao instalar plugins adicionais como o WarMod, basta jogar os arquivos `.smx` dentro da pasta `cstrike/addons/sourcemod/plugins`.

---

## 3. Configurando o Script de Inicialização para a Web

O painel web não inicia o servidor com a interface do usuário ou vinculando ao jogo cliente. Ele inicia rodando um script em segundo plano.

1. Existe um arquivo no portal chamado `start_css_server.example.sh`. Copie-o para a pasta raiz do CS:
```bash
cp /var/www/html/urban/start_css_server.example.sh /var/docker/css-server/start_css_server.sh
```

2. **Dê permissão de execução** ao script:
```bash
chmod +x /var/docker/css-server/start_css_server.sh
```
*Dica:* É esse script que o site irá executar quando você clicar em "Iniciar Servidor". Ele fecha instâncias velhas, escolhe um mapa e usa `nohup` para que o servidor não feche quando o site terminar a requisição.

---

## 4. Como Popular o arquivo `.env`

O arquivo `.env` diz ao painel onde estão os componentes no seu sistema operacional. Copie o arquivo `.env.example` para `.env` (`cp .env.example .env`) e edite:

| Variável | Descrição | Exemplo de Valor |
|----------|-----------|------------------|
| `HOST` | IP do painel Web. Use 0.0.0.0 para acesso externo. | `0.0.0.0` |
| `PORT` | Porta em que o painel vai rodar. | `8085` |
| `BASE_DIR` | Pasta onde está o portal web. | `/var/www/html/urban` |
| `DB_FILE` | Caminho absoluto para o banco de dados do site. | `/var/www/html/urban/urban.db` |
| `AVATARS_DIR` | Caminho para armazenar imagens de perfil do portal. | `/var/www/html/urban/avatars` |
| `URBAN_LOG_PATH` | Arquivo que o UT4 usa para salvar Kills. | `/home/lucas/urbanterror43/q3ut4/games.log` |
| `CS_SERVER_SCRIPT` | **O script de inicialização do CS que criamos no Passo 3.** | `/var/docker/css-server/start_css_server.sh` |

**Aviso Importante:**
Sempre que fizer alterações no `.env` você deve reiniciar o painel web para que ele leia as configurações novas:
```bash
sudo systemctl restart urbanvote
```

---

## 5. Configurando o `server.cfg`

O arquivo `server.cfg` é o cérebro das configurações base do seu servidor. Ele fica localizado em:
`/var/docker/css-server/server/cstrike/cfg/server.cfg`

Se o arquivo não existir, você pode criá-lo. Aqui está um modelo básico com as configurações essenciais:

```cfg
// Nome do Servidor
hostname "Meu Servidor Competitivo de CS:S"

// Senha da RCON (Essencial para o painel web administrar o servidor)
// IMPORTANTE: Deve ser a mesma senha que está no RCON_PASSWORD do seu .env
rcon_password "sua_senha_segura_aqui"

// Senha para jogadores entrarem no servidor (deixe vazio para servidor público)
sv_password ""

// Configurações de Download (FastDL para mapas customizados)
sv_allowdownload 1
sv_allowupload 1

// Taxas de atualização (Tickrate/Rates para competitivo)
sv_maxrate 0
sv_minrate 30000
sv_maxupdaterate 66
sv_minupdaterate 66
sv_maxcmdrate 66
sv_mincmdrate 66
```

---

## 6. Instalando Mapas Customizados

Quando você quiser jogar mapas que não vêm com o jogo base (como versões competitivas de Mirage ou mapas de treino), você precisa adicioná-los manualmente:

1. **Baixe o Mapa:** O arquivo do mapa terá a extensão `.bsp` (ex: `de_mirage.bsp`).
2. **Coloque na Pasta:** Mova o arquivo `.bsp` para dentro da pasta de mapas do servidor:
   `/var/docker/css-server/server/cstrike/maps/`
3. **Atualize o Mapcycle:** Para que o mapa apareça nas votações de fim de partida e no ciclo automático, adicione o nome dele no arquivo `mapcycle.txt` (localizado em `cstrike/mapcycle.txt`):
   ```text
   de_dust2
   de_inferno
   de_mirage
   ```
4. **Downloads Automáticos (FastDL):** Se os jogadores não tiverem o mapa, o jogo tentará baixar direto do servidor. Para mapas muito pesados, isso pode ser lento. Para resolver isso, recomenda-se configurar um FastDL usando um servidor Web (nginx/apache) e configurar a variável `sv_downloadurl "http://seu-site.com/cstrike"` no seu `server.cfg`.
