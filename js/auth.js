// ─── Authentication & Session Module ──────────────────────────────────────────

const browserId = localStorage.getItem("browserId") || generateBrowserId();
localStorage.setItem("browserId", browserId);

function checkSession() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    const loggedOutDiv = document.getElementById("authLoggedOut");
    const loggedInDiv = document.getElementById("authLoggedIn");
    
    if (auth && auth.session_token) {
        if (loggedOutDiv) loggedOutDiv.style.display = "none";
        if (loggedInDiv) loggedInDiv.style.display = "flex";
        
        const userEl = document.getElementById("loggedInUsername");
        if (userEl) userEl.innerText = auth.username;
        
        const badge = document.getElementById("linkedPlayerBadge");
        if (badge) {
            if (auth.player_name) {
                badge.style.display = "inline-flex";
                badge.innerHTML = `<i class="fas fa-gamepad"></i> ${auth.player_name}`;
            } else {
                badge.style.display = "none";
                
                // Auto-link if character was linking before login
                const savedProfile = JSON.parse(localStorage.getItem("urban_profile") || "null");
                if (savedProfile && savedProfile.name && savedProfile.code) {
                    console.log("[INFO] Autolinking player on checkSession:", savedProfile.name);
                    fetch(`${API_URL}/link-player`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: auth.username,
                            session_token: auth.session_token,
                            player_name: savedProfile.name,
                            auth_code: savedProfile.code
                        })
                    })
                    .then(res => { if (res.ok) return res.json(); })
                    .then(data => {
                        if (data && data.player_name) {
                            auth.player_name = data.player_name;
                            localStorage.setItem("urban_auth", JSON.stringify(auth));
                            localStorage.removeItem("urban_profile");
                            location.reload();
                        }
                    })
                    .catch(err => console.error("Erro no auto-vinculo:", err));
                }
            }
        }
    } else {
        if (loggedOutDiv) loggedOutDiv.style.display = "flex";
        if (loggedInDiv) loggedInDiv.style.display = "none";
        window.location.href = "login.html";
    }
}

function openAccountMgmtModal() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    document.getElementById("accountMgmtModal").style.display = "flex";
    document.getElementById("mgmtUsername").innerText = auth.username;
    
    const linkedPlayerSection = document.getElementById("mgmtLinkedPlayerSection");
    const linkedActions = document.getElementById("mgmtLinkedActions");
    const unlinkedActions = document.getElementById("mgmtUnlinkedActions");
    
    if (auth.player_name) {
        linkedPlayerSection.innerHTML = `<p style="margin: 0; color: #00ff99; font-size: 0.9em;"><i class="fas fa-link"></i> Vinculado a: <strong>${auth.player_name}</strong></p>`;
        linkedActions.style.display = "block";
        unlinkedActions.style.display = "none";
    } else {
        linkedPlayerSection.innerHTML = `<p style="margin: 0; color: #ffaa00; font-size: 0.9em;"><i class="fas fa-exclamation-triangle"></i> Nenhum personagem vinculado</p>`;
        linkedActions.style.display = "none";
        unlinkedActions.style.display = "block";
    }

    const activeName = auth.player_name || auth.username;
    fetch(`${API_URL}/profile?player=${encodeURIComponent(activeName)}`)
        .then(res => res.json())
        .then(data => {
            const preview = document.getElementById("mgmtAvatarPreview");
            if (data.avatar) {
                preview.src = data.avatar;
            } else {
                preview.src = "img/default_avatar.png";
            }
        })
        .catch(() => {
            document.getElementById("mgmtAvatarPreview").src = "img/default_avatar.png";
        });
}

async function handleLinkCharacter() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    const playerName = document.getElementById("mgmtLinkNick").value.trim();
    const code = document.getElementById("mgmtLinkCode").value.trim();
    
    if (!playerName || !code) { showToast("warning", "Preencha o nick e o código."); return; }
    
    try {
        const res = await fetch(`${API_URL}/link-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: auth.username,
                session_token: auth.session_token,
                player_name: playerName,
                auth_code: code
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            auth.player_name = data.player_name;
            localStorage.setItem("urban_auth", JSON.stringify(auth));
            
            document.getElementById("mgmtLinkNick").value = "";
            document.getElementById("mgmtLinkCode").value = "";
            
            checkSession();
            openAccountMgmtModal();
            showToast("success", "Personagem vinculado com sucesso!");
        } else {
            showToast("error", await res.text());
        }
    } catch (e) {
        showToast("error", "Erro na conexão.");
    }
}

async function handleRenameCharacter() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    const newName = document.getElementById("mgmtNewNick").value.trim();
    const code = document.getElementById("mgmtNewNickCode").value.trim();
    
    if (!newName || !code) { showToast("warning", "Preencha o novo nick e o novo código (!auth)."); return; }
    
    try {
        const res = await fetch(`${API_URL}/rename-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: auth.username,
                session_token: auth.session_token,
                new_player_name: newName,
                auth_code: code
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            auth.player_name = data.player_name;
            localStorage.setItem("urban_auth", JSON.stringify(auth));
            
            document.getElementById("mgmtNewNick").value = "";
            document.getElementById("mgmtNewNickCode").value = "";
            
            checkSession();
            openAccountMgmtModal();
            showToast("success", "Personagem renomeado e histórico migrado com sucesso!");
            location.reload();
        } else {
            showToast("error", await res.text());
        }
    } catch (e) {
        showToast("error", "Erro na conexão.");
    }
}

function handleLogout() {
    localStorage.removeItem("urban_auth");
    localStorage.removeItem("aim_trainer_highscores");
    localStorage.removeItem("reaction_highscore");
    localStorage.removeItem("spray_highscore");
    localStorage.removeItem("fof_highscore");
    localStorage.removeItem("grenade_highscore");
    
    const aimHighScoreEl = document.getElementById("aimTrainerHighScore");
    if (aimHighScoreEl) aimHighScoreEl.innerText = "0";
    const reactionHighScoreEl = document.getElementById("reactionHighScore");
    if (reactionHighScoreEl) reactionHighScoreEl.innerText = "Sem recorde";
    const sprayHighScoreEl = document.getElementById("sprayHighScore");
    if (sprayHighScoreEl) sprayHighScoreEl.innerText = "0%";
    const fofHighScoreEl = document.getElementById("fofHighScore");
    if (fofHighScoreEl) fofHighScoreEl.innerText = "0";
    const grenadeHighScoreEl = document.getElementById("grenadeHighScore");
    if (grenadeHighScoreEl) grenadeHighScoreEl.innerText = "0";

    showToast("info", "Sessão encerrada.");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
}

document.getElementById("myProfileBtn").onclick = () => {
    openAccountMgmtModal();
};

const viewMyProfileBtn = document.getElementById("viewMyProfileBtn");
if (viewMyProfileBtn) {
    viewMyProfileBtn.onclick = () => {
        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        if (auth) {
            document.getElementById("accountMgmtModal").style.display = "none";
            openProfile(auth.player_name || auth.username);
        }
    };
}

document.getElementById("accountMgmtClose").onclick = () => {
    document.getElementById("accountMgmtModal").style.display = "none";
};

window.checkSession = checkSession;
window.handleLogout = handleLogout;
window.openAccountMgmtModal = openAccountMgmtModal;
