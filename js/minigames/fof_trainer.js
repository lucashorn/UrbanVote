// ─── Friend or Foe Minigame Module ───────────────────────────────────────────

let fofGameRunning = false;
let fofScore = 0;
let fofTimeLimit = 30;
let fofTimerValue = 0;
let fofTimerId = null;
let fofSpawnTimerId = null;
let fofHits = 0;
let fofClicks = 0;
let fofFriendsHit = 0;
let fofEnemiesKilled = 0;
let fofTargets = [];
let nextFofTargetId = 1;

function startFofTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("fofTrainerGame").style.display = "block";
    document.getElementById("fofTrainerSetup").style.display = "block";
    document.getElementById("fofTrainerPlayground").style.display = "none";
    document.getElementById("fofGameOver").style.display = "none";
    
    const saved = parseInt(localStorage.getItem("fof_highscore") || "0");
    document.getElementById("fofGameHighScore").innerText = saved;
}

function startFofGame() {
    if (fofGameRunning) return;
    
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
        ctx.resume();
    }
    
    fofGameRunning = true;
    fofScore = 0;
    fofHits = 0;
    fofClicks = 0;
    fofFriendsHit = 0;
    fofEnemiesKilled = 0;
    fofTimerValue = fofTimeLimit;
    fofTargets = [];
    nextFofTargetId = 1;
    
    document.getElementById("fofTrainerSetup").style.display = "none";
    document.getElementById("fofTrainerPlayground").style.display = "block";
    document.getElementById("fofGameOver").style.display = "none";
    
    document.getElementById("fofLiveScore").innerText = "0";
    document.getElementById("fofLiveTimer").innerText = fofTimerValue + "s";
    document.getElementById("fofLiveAccuracy").innerText = "0 / 0";
    
    const targetArea = document.getElementById("fofTargetArea");
    targetArea.innerHTML = "";
    
    targetArea.onclick = handleFofPlaygroundClick;
    
    startCountdown("fofTargetArea", () => {
        fofTimerId = setInterval(() => {
            fofTimerValue--;
            document.getElementById("fofLiveTimer").innerText = fofTimerValue + "s";
            if (fofTimerValue <= 0) {
                stopFofGame(true);
            }
        }, 1000);
        
        spawnFofTarget();
        fofSpawnTimerId = setInterval(spawnFofTarget, 650);
    });
}

function handleFofPlaygroundClick(e) {
    if (!fofGameRunning) return;
    if (e.target.id === "fofTargetArea") {
        fofClicks++;
        fofScore = Math.max(0, fofScore - 20);
        playMissSound();
        createFofMissRipple(e.clientX, e.clientY);
        createFofFloatingText(e.clientX, e.clientY, "-20", "#ff3333");
        updateFofLiveStats();
    }
}

function updateFofLiveStats() {
    document.getElementById("fofLiveScore").innerText = fofScore;
    document.getElementById("fofLiveAccuracy").innerText = `${fofEnemiesKilled} / ${fofClicks}`;
}

function spawnFofTarget() {
    if (!fofGameRunning) return;
    
    const targetArea = document.getElementById("fofTargetArea");
    
    const isEnemy = Math.random() < 0.70;
    const type = isEnemy ? "enemy" : "friend";
    
    const minX = 10;
    const maxX = 90;
    const minY = 10;
    const maxY = 90;
    
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    
    const targetId = nextFofTargetId++;
    
    const targetEl = document.createElement("div");
    targetEl.className = `aim-target fof-target fof-${type}`;
    targetEl.id = `fof-target-${targetId}`;
    targetEl.style.left = x + "%";
    targetEl.style.top = y + "%";
    targetEl.style.position = "absolute";
    targetEl.style.width = "40px";
    targetEl.style.height = "40px";
    targetEl.style.borderRadius = "50%";
    targetEl.style.cursor = "pointer";
    targetEl.style.display = "flex";
    targetEl.style.alignItems = "center";
    targetEl.style.justifyContent = "center";
    targetEl.style.transform = "translate(-50%, -50%)";
    targetEl.style.animation = "targetSpawn 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    
    if (isEnemy) {
        targetEl.style.background = "radial-gradient(circle, #ff4444 0%, #cc0000 100%)";
        targetEl.style.boxShadow = "0 0 10px rgba(255, 68, 68, 0.6)";
        targetEl.innerHTML = '<i class="fas fa-skull" style="color: white; font-size: 0.95em;"></i>';
    } else {
        targetEl.style.background = "radial-gradient(circle, #2563eb 0%, #1e40af 100%)";
        targetEl.style.boxShadow = "0 0 10px rgba(37, 99, 235, 0.6)";
        targetEl.innerHTML = '<i class="fas fa-shield" style="color: white; font-size: 0.95em;"></i>';
    }
    
    targetArea.appendChild(targetEl);
    
    const targetObj = {
        id: targetId,
        type: type,
        spawnTime: performance.now(),
        element: targetEl
    };
    
    fofTargets.push(targetObj);
    
    targetEl.onclick = (e) => {
        e.stopPropagation();
        handleFofTargetClick(targetObj, e.clientX, e.clientY);
    };
    
    setTimeout(() => {
        if (targetEl && targetEl.parentNode) {
            fofTargets = fofTargets.filter(t => t.id !== targetId);
            targetEl.remove();
            
            if (isEnemy && fofGameRunning) {
                fofScore = Math.max(0, fofScore - 50);
                const rect = targetArea.getBoundingClientRect();
                const floatX = rect.left + (x/100)*rect.width;
                const floatY = rect.top + (y/100)*rect.height;
                createFofFloatingText(floatX, floatY, "-50", "#ff3333");
                updateFofLiveStats();
            }
        }
    }, 1500);
}

function handleFofTargetClick(target, clickX, clickY) {
    if (!fofGameRunning) return;
    
    fofClicks++;
    
    if (target.element && target.element.parentNode) {
        target.element.remove();
    }
    fofTargets = fofTargets.filter(t => t.id !== target.id);
    
    if (target.type === "enemy") {
        fofHits++;
        fofEnemiesKilled++;
        fofScore += 100;
        playHitSound();
        createFofHitRipple(clickX, clickY);
        createFofFloatingText(clickX, clickY, "+100", "#00ff99");
    } else {
        fofFriendsHit++;
        fofScore = Math.max(0, fofScore - 150);
        playFriendHitSound();
        createFofMissRipple(clickX, clickY);
        createFofFloatingText(clickX, clickY, "-150", "#ff3333");
    }
    
    updateFofLiveStats();
}

function stopFofGame(finished = false) {
    fofGameRunning = false;
    
    if (fofTimerId) {
        clearInterval(fofTimerId);
        fofTimerId = null;
    }
    if (fofSpawnTimerId) {
        clearInterval(fofSpawnTimerId);
        fofSpawnTimerId = null;
    }
    
    const targetArea = document.getElementById("fofTargetArea");
    if (targetArea) {
        targetArea.onclick = null;
        targetArea.innerHTML = "";
    }
    
    if (finished) {
        document.getElementById("fofEndScore").innerText = fofScore;
        document.getElementById("fofEndEnemiesKilled").innerText = fofEnemiesKilled;
        document.getElementById("fofEndFriendsHit").innerText = fofFriendsHit;
        
        document.getElementById("fofTrainerPlayground").style.display = "none";
        document.getElementById("fofGameOver").style.display = "block";
        
        const oldScore = parseInt(localStorage.getItem("fof_highscore") || "0");
        let isNewHighScore = false;
        if (fofScore > oldScore) {
            localStorage.setItem("fof_highscore", fofScore);
            document.getElementById("fofGameHighScore").innerText = fofScore;
            isNewHighScore = true;
        }
        
        const flash = document.getElementById("newFofHighScoreFlash");
        if (isNewHighScore) {
            flash.style.display = "block";
            playSuccessSound();
        } else {
            flash.style.display = "none";
        }
        
        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        if (auth && auth.session_token) {
            fetch(`${API_URL}/update-minigame-highscore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: auth.username,
                    session_token: auth.session_token,
                    game_type: "fof",
                    highscore: fofScore
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok" && data.updated) {
                    localStorage.setItem("fof_highscore", data.highscore);
                    document.getElementById("fofGameHighScore").innerText = data.highscore;
                    flash.style.display = "block";
                }
            })
            .catch(err => console.error("Erro ao salvar recorde no banco:", err));
        }
    }
}

function createFofHitRipple(clientX, clientY) {
    const area = document.getElementById("fofTargetArea");
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ripple = document.createElement("div");
    ripple.className = "aim-hit-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    area.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 400);
}

function createFofMissRipple(clientX, clientY) {
    const area = document.getElementById("fofTargetArea");
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ripple = document.createElement("div");
    ripple.className = "aim-miss-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    area.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 400);
}

function createFofFloatingText(clientX, clientY, text, color) {
    const area = document.getElementById("fofTargetArea");
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ft = document.createElement("div");
    ft.className = "aim-floating-text";
    ft.style.left = x + "px";
    ft.style.top = y + "px";
    ft.style.color = color;
    ft.innerText = text;
    area.appendChild(ft);
    
    setTimeout(() => ft.remove(), 600);
}

function playFriendHitSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        console.error(e);
    }
}

function playSuccessSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
        console.error(e);
    }
}

