// ─── Minigames Core Module ──────────────────────────────────────────────────

let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playHitSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
        console.error("Erro ao tocar som de hit:", e);
    }
}

function playMissSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
        console.error("Erro ao tocar som de miss:", e);
    }
}

function playCountdownBeep() {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 1000;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        }
    } catch(e) {
        console.error(e);
    }
}

function stopAllMinigames() {
    stopAimTrainer(false);
    stopReactionTrainer(false);
    stopSprayTrainer(false);
    stopFofGame(false);
    stopGrenadeGame(false);
    stopTermoTrainer(false);
    stopBombTrainer(false);
}

function showMinigamesMenu() {
    stopAllMinigames();
    document.getElementById("minigamesMenu").style.display = "block";
    document.getElementById("aimTrainerGame").style.display = "none";
    document.getElementById("reactionTrainerGame").style.display = "none";
    document.getElementById("sprayTrainerGame").style.display = "none";
    document.getElementById("fofTrainerGame").style.display = "none";
    document.getElementById("grenadeTrainerGame").style.display = "none";
    document.getElementById("termoTrainerGame").style.display = "none";
    document.getElementById("bombTrainerGame").style.display = "none";
    
    const aimHighScores = JSON.parse(localStorage.getItem("aim_trainer_highscores") || "{}");
    let maxAim = 0;
    Object.values(aimHighScores).forEach(score => {
        if (score > maxAim) maxAim = score;
    });

    const localReaction = parseInt(localStorage.getItem("reaction_highscore") || "0");
    const localSpray = parseInt(localStorage.getItem("spray_highscore") || "0");
    const localFof = parseInt(localStorage.getItem("fof_highscore") || "0");
    const localGrenade = parseInt(localStorage.getItem("grenade_highscore") || "0");
    const localTermo = parseInt(localStorage.getItem("termo_highscore") || "0");
    const localBomb = parseInt(localStorage.getItem("bomb_highscore") || "0");

    document.getElementById("aimTrainerHighScore").innerText = maxAim;
    document.getElementById("reactionHighScore").innerText = localReaction > 0 ? `${localReaction} ms` : "Sem recorde";
    document.getElementById("sprayHighScore").innerText = localSpray > 0 ? `${localSpray}%` : "0%";
    document.getElementById("fofHighScore").innerText = localFof;
    document.getElementById("grenadeHighScore").innerText = localGrenade;
    document.getElementById("termoHighScore").innerText = localTermo;
    document.getElementById("bombHighScore").innerText = localBomb;

    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (auth) {
        const activeName = auth.player_name || auth.username;
        fetch(`${API_URL}/profile?player=${encodeURIComponent(activeName)}`)
            .then(res => res.json())
            .then(data => {
                if (data) {
                    const dbAim = data.aimHighscore || 0;
                    const dbReaction = data.reactionHighscore || 0;
                    const dbSpray = data.sprayHighscore || 0;
                    const dbFof = data.fofHighscore || 0;
                    const dbGrenade = data.grenadeHighscore || 0;
                    const dbTermo = data.termoHighscore || 0;
                    const dbBomb = data.bombHighscore || 0;

                    if (dbAim > maxAim) {
                        maxAim = dbAim;
                        document.getElementById("aimTrainerHighScore").innerText = maxAim;
                    }
                    if (dbReaction > 0 && (localReaction === 0 || dbReaction < localReaction)) {
                        localStorage.setItem("reaction_highscore", dbReaction);
                        document.getElementById("reactionHighScore").innerText = `${dbReaction} ms`;
                    }
                    if (dbSpray > localSpray) {
                        localStorage.setItem("spray_highscore", dbSpray);
                        document.getElementById("sprayHighScore").innerText = `${dbSpray}%`;
                    }
                    if (dbFof > localFof) {
                        localStorage.setItem("fof_highscore", dbFof);
                        document.getElementById("fofHighScore").innerText = dbFof;
                    }
                    if (dbGrenade > localGrenade) {
                        localStorage.setItem("grenade_highscore", dbGrenade);
                        document.getElementById("grenadeHighScore").innerText = dbGrenade;
                    }
                    if (dbTermo > localTermo) {
                        localStorage.setItem("termo_highscore", dbTermo);
                        document.getElementById("termoHighScore").innerText = dbTermo;
                    }
                    if (dbBomb > localBomb) {
                        localStorage.setItem("bomb_highscore", dbBomb);
                        document.getElementById("bombHighScore").innerText = dbBomb;
                    }
                }
            })
            .catch(err => console.error("Erro ao sincronizar recordes com banco:", err));
    }
}

function startCountdown(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = "";
    
    const overlay = document.createElement("div");
    overlay.id = containerId + "-countdown-overlay";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(10, 15, 26, 0.75)";
    overlay.style.zIndex = "100";
    overlay.style.userSelect = "none";
    
    const countEl = document.createElement("div");
    countEl.style.fontSize = "5.5em";
    countEl.style.fontWeight = "900";
    countEl.style.color = "#a855f7"; 
    countEl.style.textShadow = "0 0 20px rgba(168, 85, 247, 0.8)";
    countEl.style.transition = "transform 0.15s ease-out, opacity 0.15s ease-out";
    countEl.style.transform = "scale(0.5)";
    countEl.style.opacity = "0";
    overlay.appendChild(countEl);
    
    container.appendChild(overlay);
    
    let currentCount = 3;
    
    const updateCount = () => {
        if (currentCount > 0) {
            countEl.innerText = currentCount;
            try {
                const ctx = getAudioContext();
                if (ctx) {
                    if (ctx.state === 'suspended') ctx.resume();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.value = 880; 
                    gain.gain.setValueAtTime(0.12, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.15);
                }
            } catch(e) {
                console.error(e);
            }
            
            countEl.style.transform = "scale(0.5)";
            countEl.style.opacity = "0";
            countEl.offsetHeight; // force reflow
            countEl.style.transform = "scale(1.2)";
            countEl.style.opacity = "1";
            
            setTimeout(() => {
                countEl.style.transform = "scale(1.0)";
            }, 150);
            
            currentCount--;
            setTimeout(updateCount, 1000);
        } else {
            countEl.innerText = "VAI!";
            countEl.style.color = "#00ff99";
            countEl.style.textShadow = "0 0 20px rgba(0, 255, 153, 0.8)";
            countEl.style.transform = "scale(1.3)";
            
            try {
                const ctx = getAudioContext();
                if (ctx) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.value = 1200; 
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.25);
                }
            } catch(e) {
                console.error(e);
            }
            
            setTimeout(() => {
                overlay.remove();
                onComplete();
            }, 600);
        }
    };
    
    updateCount();
}

document.getElementById("minigamesBtn").onclick = () => {
    // Close other panels
    document.getElementById("killRankingPanel").classList.remove("open");
    document.getElementById("historyPanel").classList.remove("open");
    const allMatchesBtn = document.getElementById("openAllMatchesBtn");
    if (allMatchesBtn) allMatchesBtn.style.display = "none";
    
    document.getElementById("minigamesModal").style.display = "flex";
    showMinigamesMenu();
};

document.getElementById("minigamesClose").onclick = () => {
    showMinigamesMenu();
    document.getElementById("minigamesModal").style.display = "none";
};
