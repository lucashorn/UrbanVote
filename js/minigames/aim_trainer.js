// ─── Aim Trainer Minigame Module ─────────────────────────────────────────────

let aimGameRunning = false;
let aimScore = 0;
let aimHits = 0;
let aimClicks = 0;
let aimTimeLimit = 15;
let aimTimerValue = 15;
let aimMovementType = 'static';
let aimGameTimerId = null;
let aimSpawnTimerId = null;
let aimAnimationId = null;
let aimTargets = [];
let nextTargetId = 1;
let lastFrameTime = 0;

function startAimTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("aimTrainerGame").style.display = "block";
    document.getElementById("aimTrainerSetup").style.display = "block";
    document.getElementById("aimTrainerPlayground").style.display = "none";
    document.getElementById("aimTrainerGameOver").style.display = "none";
    
    updateAimTrainerSetupHighscore();
}

function updateAimTrainerSetupHighscore() {
    const duration = getSelectedAimDuration();
    const movement = getSelectedAimMovement();
    const key = `${duration}_${movement}`;
    const highScores = JSON.parse(localStorage.getItem("aim_trainer_highscores") || "{}");
    const score = highScores[key] || 0;
    document.getElementById("aimTrainerGameHighScore").innerText = score;
}

function setupAimTrainerToggles() {
    const durationBtns = document.querySelectorAll("#aimDurationToggle .setup-toggle-btn");
    durationBtns.forEach(btn => {
        btn.onclick = () => {
            durationBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            updateAimTrainerSetupHighscore();
        };
    });

    const movementBtns = document.querySelectorAll("#aimMovementToggle .setup-toggle-btn");
    movementBtns.forEach(btn => {
        btn.onclick = () => {
            movementBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            updateAimTrainerSetupHighscore();
        };
    });
}

function getSelectedAimDuration() {
    const activeBtn = document.querySelector("#aimDurationToggle .setup-toggle-btn.active");
    return activeBtn ? parseInt(activeBtn.dataset.val) : 15;
}

function getSelectedAimMovement() {
    const activeBtn = document.querySelector("#aimMovementToggle .setup-toggle-btn.active");
    return activeBtn ? activeBtn.dataset.val : "static";
}

document.getElementById("startAimGameBtn").onclick = startAimTrainer;

function startAimTrainer() {
    if (aimGameRunning) return;
    
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
        ctx.resume();
    }
    
    aimGameRunning = true;
    aimScore = 0;
    aimHits = 0;
    aimClicks = 0;
    aimTimeLimit = getSelectedAimDuration();
    aimTimerValue = aimTimeLimit;
    aimMovementType = getSelectedAimMovement();
    aimTargets = [];
    nextTargetId = 1;
    
    document.getElementById("aimTrainerSetup").style.display = "none";
    document.getElementById("aimTrainerPlayground").style.display = "block";
    document.getElementById("aimTrainerGameOver").style.display = "none";
    
    document.getElementById("gameScore").innerText = "0";
    document.getElementById("gameTimer").innerText = aimTimerValue + "s";
    document.getElementById("gameAccuracy").innerText = "100%";
    
    const targetArea = document.getElementById("aimTargetArea");
    targetArea.innerHTML = "";
    targetArea.onclick = handlePlaygroundClick;
    
    startCountdown("aimTargetArea", () => {
        aimGameTimerId = setInterval(() => {
            aimTimerValue--;
            document.getElementById("gameTimer").innerText = aimTimerValue + "s";
            if (aimTimerValue <= 0) {
                stopAimTrainer(true);
            }
        }, 1000);
        
        for (let i = 0; i < 3; i++) {
            spawnTarget();
        }
        
        lastFrameTime = performance.now();
        aimAnimationId = requestAnimationFrame(updateTargetsPhysics);
    });
}

function handlePlaygroundClick(e) {
    if (!aimGameRunning) return;
    
    const target = e.target.closest(".aim-target");
    aimClicks++;
    
    if (target) {
        const targetId = parseInt(target.dataset.id);
        aimHits++;
        aimScore += 100;
        
        aimTargets = aimTargets.filter(t => t.id !== targetId);
        target.remove();
        
        playHitSound();
        createHitRipple(e.clientX, e.clientY);
        createFloatingText(e.clientX, e.clientY, "+100", "#00ff99");
        
        spawnTarget();
    } else {
        aimScore = Math.max(0, aimScore - 25);
        playMissSound();
        createMissRipple(e.clientX, e.clientY);
        createFloatingText(e.clientX, e.clientY, "-25", "#ff3333");
    }
    
    updateLiveStats();
}

function updateLiveStats() {
    document.getElementById("gameScore").innerText = aimScore;
    const accuracy = aimClicks > 0 ? Math.round((aimHits / aimClicks) * 100) : 100;
    document.getElementById("gameAccuracy").innerText = accuracy + "%";
}

function createHitRipple(clientX, clientY) {
    const area = document.getElementById("aimTargetArea");
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

function createMissRipple(clientX, clientY) {
    const area = document.getElementById("aimTargetArea");
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

function createFloatingText(clientX, clientY, text, color) {
    const area = document.getElementById("aimTargetArea");
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

function spawnTarget() {
    if (!aimGameRunning) return;
    
    const area = document.getElementById("aimTargetArea");
    
    const minX = 10;
    const maxX = 90;
    const minY = 10;
    const maxY = 90;
    
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    
    let vx = 0;
    let vy = 0;
    const speed = 0.03 + Math.random() * 0.03;
    
    if (aimMovementType === "horizontal") {
        vx = (Math.random() > 0.5 ? 1 : -1) * speed;
    } else if (aimMovementType === "vertical") {
        vy = (Math.random() > 0.5 ? 1 : -1) * speed;
    } else if (aimMovementType === "mixed") {
        const angle = Math.random() * Math.PI * 2;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
    }
    
    const targetId = nextTargetId++;
    const targetObj = {
        id: targetId,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        spawnTime: performance.now(),
        lifeTime: 2200
    };
    
    aimTargets.push(targetObj);
    
    const targetEl = document.createElement("div");
    targetEl.className = "aim-target";
    targetEl.id = `target-${targetId}`;
    targetEl.dataset.id = targetId;
    targetEl.style.left = x + "%";
    targetEl.style.top = y + "%";
    
    area.appendChild(targetEl);
}

function updateTargetsPhysics(timestamp) {
    if (!aimGameRunning) return;
    
    const dt = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    aimTargets.forEach(t => {
        if (t.vx !== 0 || t.vy !== 0) {
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            
            if (t.x < 5) {
                t.x = 5;
                t.vx *= -1;
            } else if (t.x > 95) {
                t.x = 95;
                t.vx *= -1;
            }
            
            if (t.y < 5) {
                t.y = 5;
                t.vy *= -1;
            } else if (t.y > 95) {
                t.y = 95;
                t.vy *= -1;
            }
            
            const el = document.getElementById(`target-${t.id}`);
            if (el) {
                el.style.left = t.x + "%";
                el.style.top = t.y + "%";
            }
        }
    });
    
    aimAnimationId = requestAnimationFrame(updateTargetsPhysics);
}

function stopAimTrainer(finished = false) {
    aimGameRunning = false;
    
    if (aimGameTimerId) {
        clearInterval(aimGameTimerId);
        aimGameTimerId = null;
    }
    if (aimSpawnTimerId) {
        clearInterval(aimSpawnTimerId);
        aimSpawnTimerId = null;
    }
    if (aimAnimationId) {
        cancelAnimationFrame(aimAnimationId);
        aimAnimationId = null;
    }
    
    const targetArea = document.getElementById("aimTargetArea");
    if (targetArea) {
        targetArea.onclick = null;
        targetArea.innerHTML = "";
    }
    
    if (finished) {
        const accuracy = aimClicks > 0 ? Math.round((aimHits / aimClicks) * 100) : 0;
        const hps = aimTimeLimit > 0 ? (aimHits / aimTimeLimit).toFixed(2) : "0.00";
        
        document.getElementById("endScore").innerText = aimScore;
        document.getElementById("endAccuracy").innerText = accuracy + "%";
        document.getElementById("endHits").innerText = aimHits;
        document.getElementById("endClicks").innerText = aimClicks;
        document.getElementById("endHps").innerText = hps + " HPS";
        
        const duration = aimTimeLimit;
        const movement = aimMovementType;
        const key = `${duration}_${movement}`;
        const highScores = JSON.parse(localStorage.getItem("aim_trainer_highscores") || "{}");
        const oldHighScore = highScores[key] || 0;
        
        let isNewHighScore = false;
        if (aimScore > oldHighScore) {
            highScores[key] = aimScore;
            localStorage.setItem("aim_trainer_highscores", JSON.stringify(highScores));
            isNewHighScore = true;
        }
        
        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        if (auth && auth.session_token) {
            fetch(`${API_URL}/update-highscore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: auth.username,
                    session_token: auth.session_token,
                    highscore: aimScore
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok") {
                    auth.aim_highscore = data.aim_highscore;
                    localStorage.setItem("urban_auth", JSON.stringify(auth));
                    if (data.aim_highscore > oldHighScore) {
                        highScores[key] = data.aim_highscore;
                        localStorage.setItem("aim_trainer_highscores", JSON.stringify(highScores));
                        document.getElementById("newHighScoreFlash").style.display = "block";
                    }
                }
            })
            .catch(err => console.error("Erro ao salvar recorde no banco:", err));
        }
        
        document.getElementById("aimTrainerPlayground").style.display = "none";
        document.getElementById("aimTrainerGameOver").style.display = "block";
        
        const flashMsg = document.getElementById("newHighScoreFlash");
        if (isNewHighScore) {
            flashMsg.style.display = "block";
        } else {
            flashMsg.style.display = "none";
        }
    }
}

function restartAimTrainer() {
    document.getElementById("aimTrainerGameOver").style.display = "none";
    startAimTrainer();
}

setupAimTrainerToggles();
