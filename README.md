# UrbanVote

Painel e sistema de votação para servidores dedicados de Urban Terror 4.3.
O sistema permite que os jogadores votem no próximo mapa, modo de jogo, armas permitidas e configuração de fogo amigo, além de possuir um rastreador em tempo real de estatísticas (Kills/Deaths) extraídas diretamente dos logs do servidor de jogo.

> **Novidade**: O painel agora também funciona como um centralizador para gerenciar seu servidor de **Counter-Strike: Source**. Para aprender a configurar o servidor de CS:S, instalar os mods (MetaMod/SourceMod) e integrá-lo ao painel, [leia o Guia de Setup do CS:S](CS_SETUP_GUIDE.md).

## Como Iniciar o Servidor Manualmente

O backend é feito em Python e roda por padrão na porta `8085`. Para iniciá-lo manualmente no terminal, navegue até a pasta do projeto e execute:

```bash
cd /var/www/html/urban
pip install python-dotenv
python3 server.py
```

O servidor começará a monitorar o arquivo `games.log` do Urban Terror a cada 5 segundos para processar as Kills.

---

## Configurando como Serviço no Linux (Iniciar com o sistema)

Para que o painel inicie sozinho toda vez que você ligar ou reiniciar a máquina, você pode configurá-lo como um serviço do `systemd`.

### 1. Criar o arquivo de serviço
Abra o terminal e crie o arquivo `.service` com permissão de administrador:
```bash
sudo nano /etc/systemd/system/urbanvote.service
```

### 2. Adicionar as configurações
Cole o conteúdo abaixo no arquivo criado (ajuste o campo `User` se o seu usuário não for o `lucas`):

```ini
[Unit]
Description=UrbanVote Python Server
After=network.target

[Service]
User=lucas
WorkingDirectory=/var/www/html/urban
ExecStart=/usr/bin/python3 /var/www/html/urban/server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
*Dica: Salve e saia do nano apertando `Ctrl+O`, `Enter` e `Ctrl+X`.*

### 3. Ativar e Iniciar o Serviço

Após criar o arquivo, atualize os serviços do Linux:
```bash
sudo systemctl daemon-reload
```

Inicie o servidor de votação:
```bash
sudo systemctl start urbanvote
```

Habilite o servidor para iniciar automaticamente junto com o computador:
```bash
sudo systemctl enable urbanvote
```

### 4. Como checar o status ou ver logs?
Para verificar se está tudo rodando perfeitamente:
```bash
sudo systemctl status urbanvote
```
Para ver o terminal/logs de erro do servidor (caso ele pare de funcionar):
```bash
sudo journalctl -u urbanvote -f
```
