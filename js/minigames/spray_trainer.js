// ─── Spray Control Trainer Minigame Module ───────────────────────────────────

let sprayGameRunning = false;
let sprayAmmo = 30;
let sprayHits = 0;
let sprayScore = 0;
let sprayIntervalId = null;
let sprayCenterHits = 0;
let sprayMouseX = 0;
let sprayMouseY = 0;
let sprayShotCount = 0;

const sprayRecoilPattern = [
    {x: 0, y: 0},
    {x: 2, y: -8},
    {x: 5, y: -18},
    {x: 8, y: -30},
    {x: 6, y: -42},
    {x: 3, y: -55},
    {x: -2, y: -68},
    {x: -6, y: -80},
    {x: -12, y: -90},
    {x: -18, y: -98},
    {x: -14, y: -105},
    {x: -4, y: -108},
    {x: 8, y: -108},
    {x: 20, y: -106},
    {x: 32, y: -104},
    {x: 44, y: -100},
    {x: 52, y: -96},
    {x: 48, y: -94},
    {x: 38, y: -94},
    {x: 24, y: -95},
    {x: 10, y: -96},
    {x: -4, y: -98},
    {x: -18, y: -100},
    {x: -32, y: -101},
    {x: -44, y: -101},
    {x: -52, y: -100},
    {x: -48, y: -98},
    {x: -36, y: -95},
    {x: -22, y: -93},
    {x: -8, y: -92}
];

function startSprayTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("sprayTrainerGame").style.display = "block";
    document.getElementById("sprayTrainerPlayground").style.display = "block";
    document.getElementById("sprayGameOver").style.display = "none";
    
    const saved = parseInt(localStorage.getItem("spray_highscore") || "0");
    document.getElementById("sprayGameHighScore").innerText = saved;
    
    resetSprayArea();
}

function resetSprayArea() {
    sprayGameRunning = false;
    const targetArea = document.getElementById("sprayTargetArea");
    const bullets = targetArea.querySelectorAll(".spray-bullet-hole");
    bullets.forEach(b => b.remove());
    
    document.getElementById("sprayInstructionOverlay").style.display = "flex";
    document.getElementById("sprayLiveAccuracy").innerText = "100%";
    document.getElementById("sprayLiveMags").innerText = "30 / 30";
}

function startSprayTrainer() {
    resetSprayArea();
    document.getElementById("sprayGameOver").style.display = "none";
    document.getElementById("sprayTrainerPlayground").style.display = "block";
}

function stopSprayTrainer(finished = false) {
    sprayGameRunning = false;
    if (sprayIntervalId) {
        clearInterval(sprayIntervalId);
        sprayIntervalId = null;
    }
    
    if (finished) {
        finishSprayTrainer();
    }
}

function handleSprayShot() {
    if (!sprayGameRunning) return;
    if (sprayShotCount >= 30) {
        stopSprayTrainer(true);
        return;
    }
    
    playFireSound();
    
    const targetArea = document.getElementById("sprayTargetArea");
    const rect = targetArea.getBoundingClientRect();
    
    const recoil = sprayRecoilPattern[sprayShotCount];
    
    const bulletX = sprayMouseX + recoil.x;
    const bulletY = sprayMouseY + recoil.y;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const dist = Math.sqrt(Math.pow(bulletX - centerX, 2) + Math.pow(bulletY - centerY, 2));
    
    const bulletAccuracy = Math.max(0, Math.round(100 - (dist / 2)));
    sprayScore += bulletAccuracy;
    
    if (dist < 28) {
        sprayCenterHits++;
    }
    
    sprayShotCount++;
    sprayAmmo = 30 - sprayShotCount;
    
    const hole = document.createElement("div");
    hole.className = "spray-bullet-hole";
    hole.style.position = "absolute";
    hole.style.width = "6px";
    hole.style.height = "6px";
    hole.style.background = "#ffcc00";
    hole.style.borderRadius = "50%";
    hole.style.boxShadow = "0 0 4px #ff3300";
    hole.style.left = bulletX + "px";
    hole.style.top = bulletY + "px";
    hole.style.transform = "translate(-50%, -50%)";
    hole.style.pointerEvents = "none";
    targetArea.appendChild(hole);
    
    targetArea.style.transform = `translate(${(Math.random()*4 - 2)}px, ${(Math.random()*4 - 2 - 4)}px)`;
    setTimeout(() => {
        if (targetArea) targetArea.style.transform = "";
    }, 45);
    
    const currentAvgAcc = Math.round(sprayScore / sprayShotCount);
    document.getElementById("sprayLiveAccuracy").innerText = `${currentAvgAcc}%`;
    document.getElementById("sprayLiveMags").innerText = `${sprayAmmo} / 30`;
    
    if (sprayAmmo <= 0) {
        stopSprayTrainer(true);
    }
}

function finishSprayTrainer() {
    const finalAccuracy = Math.round(sprayScore / 30);
    
    document.getElementById("sprayEndAccuracy").innerText = `${finalAccuracy}%`;
    document.getElementById("sprayEndCenterHits").innerText = `${sprayCenterHits} / 30`;
    document.getElementById("sprayEndScore").innerText = `${sprayScore} pts`;
    
    document.getElementById("sprayTrainerPlayground").style.display = "none";
    document.getElementById("sprayGameOver").style.display = "block";
    
    const oldScore = parseInt(localStorage.getItem("spray_highscore") || "0");
    let isNewRecord = false;
    if (finalAccuracy > oldScore) {
        localStorage.setItem("spray_highscore", finalAccuracy);
        document.getElementById("sprayGameHighScore").innerText = finalAccuracy;
        isNewRecord = true;
    }
    
    const flash = document.getElementById("newSprayHighScoreFlash");
    if (isNewRecord) {
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
                game_type: "spray",
                highscore: finalAccuracy
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "ok" && data.updated) {
                localStorage.setItem("spray_highscore", data.highscore);
                document.getElementById("sprayGameHighScore").innerText = data.highscore;
                flash.style.display = "block";
            }
        })
        .catch(err => console.error("Erro ao salvar recorde no banco:", err));
    }
}

function playFireSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
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

const sprayArea = document.getElementById("sprayTargetArea");
sprayArea.onmousedown = (e) => {
    e.preventDefault();
    const rect = sprayArea.getBoundingClientRect();
    sprayMouseX = e.clientX - rect.left;
    sprayMouseY = e.clientY - rect.top;
    
    document.getElementById("sprayInstructionOverlay").style.display = "none";
    
    const oldBullets = sprayArea.querySelectorAll(".spray-bullet-hole");
    oldBullets.forEach(b => b.remove());
    
    sprayGameRunning = true;
    sprayAmmo = 30;
    sprayScore = 0;
    sprayCenterHits = 0;
    sprayShotCount = 0;
    
    handleSprayShot();
    sprayIntervalId = setInterval(handleSprayShot, 100);
};

sprayArea.onmousemove = (e) => {
    const rect = sprayArea.getBoundingClientRect();
    sprayMouseX = e.clientX - rect.left;
    sprayMouseY = e.clientY - rect.top;
};

sprayArea.onmouseup = () => {
    stopSprayTrainer(false);
};

sprayArea.onmouseleave = () => {
    stopSprayTrainer(false);
};

// Touch support
sprayArea.ontouchstart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = sprayArea.getBoundingClientRect();
    sprayMouseX = touch.clientX - rect.left;
    sprayMouseY = touch.clientY - rect.top;
    
    document.getElementById("sprayInstructionOverlay").style.display = "none";
    
    const oldBullets = sprayArea.querySelectorAll(".spray-bullet-hole");
    oldBullets.forEach(b => b.remove());
    
    sprayGameRunning = true;
    sprayAmmo = 30;
    sprayScore = 0;
    sprayCenterHits = 0;
    sprayShotCount = 0;
    
    handleSprayShot();
    sprayIntervalId = setInterval(handleSprayShot, 100);
};

sprayArea.ontouchmove = (e) => {
    const touch = e.touches[0];
    const rect = sprayArea.getBoundingClientRect();
    sprayMouseX = touch.clientX - rect.left;
    sprayMouseY = touch.clientY - rect.top;
};

sprayArea.ontouchend = () => {
    stopSprayTrainer(false);
};


