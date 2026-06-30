// ─── Server Status & Admin Actions Module ─────────────────────────────────────

async function updateServerStatus() {
    try {
        const response = await fetch(`${API_URL}/server-live`);
        const data = await response.json();
        const dot = document.getElementById("serverStatusDot");
        const text = document.getElementById("serverStatusText");
        const startBtn = document.getElementById("startServerBtn");
        const stopBtn = document.getElementById("stopServerBtn");

        if (data.running) {
            dot.className = "status-dot online";
            text.innerText = "Servidor Online";
            startBtn.style.display = "none";
            stopBtn.style.display = "inline-block";

            // Render Floating Panel
            const floatPanel = document.getElementById("livePlayersFloatingPanel");
            const floatMap = document.getElementById("floatingMapName");
            const floatCount = document.getElementById("floatingPlayerCount");
            const floatList = document.getElementById("floatingPlayerList");

            if (data.players.length === 0) {
                floatPanel.style.display = "none";
            } else {
                floatMap.innerHTML = `<i class="fas fa-map"></i> ${escHtml(data.map || "Desconhecido")}`;
                floatCount.innerText = `${data.players.length}/12`;

                floatList.innerHTML = data.players.map(p => {
                    const pingVal = parseInt(p.ping) || 0;
                    let pingClass = "ping-low";
                    if (pingVal >= 120) pingClass = "ping-high";
                    else if (pingVal >= 50) pingClass = "ping-mid";

                    const avatarHtml = p.avatar
                        ? `<img src="${p.avatar}" onclick="openAvatarZoom('${p.avatar_original || p.avatar}')" class="floating-player-avatar zoomable-avatar" title="Clique para ampliar">`
                        : `<i class="fas fa-user-circle floating-player-icon"></i>`;

                    return `
                        <div class="floating-player-row">
                            <div class="floating-player-left">
                                ${avatarHtml}
                                <span class="floating-player-name" onclick="openProfile('${escHtml(p.name)}')">${escHtml(p.name)}</span>
                            </div>
                            <div class="floating-player-right">
                                <span class="floating-player-score">${escHtml(p.score)} pts</span>
                                <span class="floating-player-ping ${pingClass}">${escHtml(p.ping)}ms</span>
                            </div>
                        </div>
                    `;
                }).join("");

                floatPanel.style.display = "flex";
            }
        } else {
            dot.className = "status-dot offline";
            text.innerText = "Servidor Offline";
            startBtn.style.display = "inline-block";
            stopBtn.style.display = "none";
            document.getElementById("livePlayersFloatingPanel").style.display = "none";
        }
        return data.running;
    } catch (e) {
        console.error("Erro ao verificar status do servidor:", e);
        return false;
    }
}

async function startServer() {
    const content = getMapcycleContent();
    if (!content) {
        showToast("warning", "Nenhum voto para gerar mapcycle.");
        return;
    }

    const btn = document.getElementById("startServerBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';

    try {
        const response = await fetch(`${API_URL}/server-start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mapcycle: content })
        });

        if (response.ok) {
            let attempts = 0;
            const maxAttempts = 15;
            const poll = setInterval(async () => {
                const isOnline = await updateServerStatus();
                attempts++;
                if (isOnline || attempts >= maxAttempts) {
                    clearInterval(poll);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }, 1000);
        } else {
            showToast("error", "Erro ao iniciar servidor: " + await response.text());
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        showToast("error", "Erro na requisição: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function stopServer() {
    if (!confirm("Deseja realmente parar o servidor?")) return;

    const btn = document.getElementById("stopServerBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parando...';

    try {
        const response = await fetch(`${API_URL}/server-stop`, { method: "POST" });

        if (response.ok) {
            let attempts = 0;
            const maxAttempts = 10;
            const poll = setInterval(async () => {
                const isOnline = await updateServerStatus();
                attempts++;
                if (!isOnline || attempts >= maxAttempts) {
                    clearInterval(poll);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }, 1000);
        } else {
            showToast("error", "Erro ao parar servidor: " + await response.text());
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        showToast("error", "Erro na requisição: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- Admin Panel Controls ---
async function execAdminCmd(cmdType, payload) {
    const pass = document.getElementById("adminPassword").value;
    const body = { password: pass, cmd_type: cmdType, ...payload };

    try {
        const res = await fetch(`${API_URL}/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            showToast("error", "Erro: " + await res.text());
            return;
        } else {
            showToast("success", "Comando executado!");
            if (cmdType === "map") document.getElementById("adminMapInput").value = "";
            if (cmdType === "kick") document.getElementById("adminKickInput").value = "";
            if (cmdType === "say") document.getElementById("adminSayInput").value = "";
        }
    } catch (e) {
        showToast("error", "Erro na requisição: " + e.message);
    }
}

// Bind Admin Panel Actions
function setupAdminControls() {
    const adminBtn = document.getElementById("adminBtn");
    if (adminBtn) {
        adminBtn.onclick = () => {
            document.getElementById("adminModal").style.display = "flex";
        };
    }

    const adminClose = document.getElementById("adminClose");
    if (adminClose) {
        adminClose.onclick = () => {
            document.getElementById("adminModal").style.display = "none";
        };
    }

    const adminPassword = document.getElementById("adminPassword");
    if (adminPassword) {
        adminPassword.oninput = (e) => {
            if (e.target.value.length > 0) {
                document.getElementById("adminActions").style.opacity = "1";
                document.getElementById("adminActions").style.pointerEvents = "auto";
            } else {
                document.getElementById("adminActions").style.opacity = "0.5";
                document.getElementById("adminActions").style.pointerEvents = "none";
            }
        };
    }

    const adminMapBtn = document.getElementById("adminMapBtn");
    if (adminMapBtn) {
        adminMapBtn.onclick = () => {
            execAdminCmd("map", { map: document.getElementById("adminMapInput").value });
        };
    }

    const adminKickBtn = document.getElementById("adminKickBtn");
    if (adminKickBtn) {
        adminKickBtn.onclick = () => {
            execAdminCmd("kick", { player: document.getElementById("adminKickInput").value });
        };
    }

    const adminSayBtn = document.getElementById("adminSayBtn");
    if (adminSayBtn) {
        adminSayBtn.onclick = () => {
            execAdminCmd("say", { msg: document.getElementById("adminSayInput").value });
        };
    }
}

