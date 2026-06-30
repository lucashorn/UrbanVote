// ─── Bomb Defuse Trainer Minigame Module (Simon Says Memory Keypad) ──────────

let bombGameRunning = false;
let bombSequence = [];
let bombUserSequence = [];
let bombLevel = 1;
let bombLives = 3;
let bombScore = 0;
let bombTimerInterval = null;
let bombTimeElapsed = 0;
let bombInputActive = false;
let bombActiveSession = false;
let bombCountdown = 0;
let bombCountdownInterval = null;
let bombCountdownRunning = false;

function playBuzzerSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch(e) {
        console.error(e);
    }
}

function playExplosionSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 1.2);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 1.4);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
        noise.stop(ctx.currentTime + 1.5);
    } catch(e) {
        console.error(e);
    }
}

function playKeyTone(number) {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const freq = 220 + number * 60;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch(e) {
        console.error(e);
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

function handleC4VisorClick() {
    if (bombGameRunning || bombCountdownRunning) return;
    triggerBombCountdown();
}

function triggerBombCountdown() {
    if (bombGameRunning || bombCountdownRunning) return;
    bombCountdownRunning = true;
    
    const led = document.getElementById("c4LedText");
    led.style.cursor = "default";
    
    let count = 3;
    const run = () => {
        if (count > 0) {
            led.innerText = count;
            led.style.color = "#ff3333";
            led.style.textShadow = "0 0 8px #ff0000";
            playCountdownBeep();
            count--;
            setTimeout(run, 1000);
        } else {
            bombCountdownRunning = false;
            startBombTrainer();
        }
    };
    run();
}

function startBombTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("bombTrainerGame").style.display = "block";
    document.getElementById("bombTrainerPlayground").style.display = "block";
    document.getElementById("bombGameOver").style.display = "none";

    const saved = parseInt(localStorage.getItem("bomb_highscore") || "0");
    document.getElementById("bombGameHighScore").innerText = saved;

    setupBombKeypad();
    resetBombGameElements();
}

function setupBombKeypad() {
    const keypad = document.querySelector(".c4-keypad");
    if (!keypad) return;
    keypad.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement("button");
        btn.className = "c4-key-btn";
        btn.id = `c4-key-${i}`;
        btn.innerText = i;
        btn.onclick = () => handleBombKeyClick(i);
        keypad.appendChild(btn);
    }
}

function resetBombGameElements() {
    bombGameRunning = false;
    bombInputActive = false;
    if (bombTimerInterval) clearInterval(bombTimerInterval);
    if (bombCountdownInterval) {
        clearInterval(bombCountdownInterval);
        bombCountdownInterval = null;
    }
    bombLevel = 1;
    bombLives = 3;
    bombScore = 0;
    bombTimeElapsed = 0;
    bombSequence = [];
    bombUserSequence = [];

    const led = document.getElementById("c4LedText");
    if (led) {
        led.innerText = "INICIAR";
        led.style.cursor = "pointer";
        led.onclick = handleC4VisorClick;
        led.style.color = "#ef4444";
        led.style.textShadow = "0 0 8px #ff0000";
    }
    document.getElementById("bombLevel").innerText = "Nível 1";
    document.getElementById("bombLives").innerText = "❤❤❤";
    document.getElementById("bombInputTimer").innerText = "-";
    document.getElementById("bombInputTimer").style.color = "#aaa";
    document.getElementById("bombScore").innerText = "0";
}

function startBombTrainer() {
    bombGameRunning = true;
    bombActiveSession = true;
    bombInputActive = false;
    if (bombTimerInterval) clearInterval(bombTimerInterval);
    if (bombCountdownInterval) {
        clearInterval(bombCountdownInterval);
        bombCountdownInterval = null;
    }
    bombLevel = 1;
    bombLives = 3;
    bombScore = 0;
    bombTimeElapsed = 0;
    bombSequence = [];
    bombUserSequence = [];

    const led = document.getElementById("c4LedText");
    if (led) {
        led.innerText = "PLAYING";
        led.style.color = "#eab308";
        led.style.textShadow = "0 0 8px #eab308";
        led.style.cursor = "default";
        led.onclick = null;
    }
    document.getElementById("bombLevel").innerText = "Nível 1";
    document.getElementById("bombLives").innerText = "❤❤❤";
    document.getElementById("bombInputTimer").innerText = "-";
    document.getElementById("bombInputTimer").style.color = "#aaa";
    document.getElementById("bombScore").innerText = "0";

    document.getElementById("bombGameOver").style.display = "none";
    document.getElementById("bombTrainerPlayground").style.display = "block";

    bombTimerInterval = setInterval(() => {
        if (!bombGameRunning) return;
        bombTimeElapsed++;
    }, 1000);

    startBombNextLevel();
}

function startBombNextLevel() {
    bombUserSequence = [];
    document.getElementById("bombLevel").innerText = `Nível ${bombLevel}`;
    document.getElementById("bombScore").innerText = bombScore;

    const seqLength = 2 + bombLevel;
    bombSequence = [];
    for (let i = 0; i < seqLength; i++) {
        bombSequence.push(Math.floor(Math.random() * 9) + 1);
    }

    playSequenceToUser();
}

function playSequenceToUser() {
    bombInputActive = false;
    if (bombCountdownInterval) {
        clearInterval(bombCountdownInterval);
        bombCountdownInterval = null;
    }
    document.getElementById("bombInputTimer").innerText = "-";
    document.getElementById("bombInputTimer").style.color = "#aaa";

    document.getElementById("c4LedText").innerText = "PLAYING";
    document.getElementById("c4LedText").style.color = "#eab308";
    document.getElementById("c4LedText").style.textShadow = "0 0 8px #eab308";

    let step = 0;
    const interval = 500 - Math.min(200, bombLevel * 15);

    const playTimer = setInterval(() => {
        if (!bombGameRunning) {
            clearInterval(playTimer);
            return;
        }

        const num = bombSequence[step];
        const btn = document.getElementById(`c4-key-${num}`);
        
        if (btn) btn.classList.add("active");
        playKeyTone(num);

        setTimeout(() => {
            if (btn) btn.classList.remove("active");
        }, interval - 100);

        step++;
        if (step >= bombSequence.length) {
            clearInterval(playTimer);
            
            setTimeout(() => {
                if (!bombActiveSession) return;
                bombInputActive = true;
                document.getElementById("c4LedText").innerText = "KEY IN";
                document.getElementById("c4LedText").style.color = "#00ff99";
                document.getElementById("c4LedText").style.textShadow = "0 0 8px #00ff99";
                startBombInputTimer();
            }, 300);
        }
    }, interval);
}

function startBombInputTimer() {
    if (bombCountdownInterval) clearInterval(bombCountdownInterval);
    bombCountdown = 5 + bombLevel;
    
    const formatTime = (sec) => `00:${sec < 10 ? '0' + sec : sec}`;

    document.getElementById("bombInputTimer").innerText = `${bombCountdown}s`;
    document.getElementById("bombInputTimer").style.color = "#ffaa00";

    const led = document.getElementById("c4LedText");
    if (led) {
        led.innerText = formatTime(bombCountdown);
        led.style.color = "#00ff99";
        led.style.textShadow = "0 0 8px #00ff99";
    }

    bombCountdownInterval = setInterval(() => {
        if (!bombGameRunning || !bombInputActive) {
            clearInterval(bombCountdownInterval);
            return;
        }
        bombCountdown--;
        if (bombCountdown <= 0) {
            bombCountdown = 0;
            document.getElementById("bombInputTimer").innerText = "0s";
            document.getElementById("bombInputTimer").style.color = "#ff3333";
            if (led) {
                led.innerText = "00:00";
                led.style.color = "#ff3333";
                led.style.textShadow = "0 0 8px #ff0000";
            }
            clearInterval(bombCountdownInterval);
            handleBombTimeout();
        } else {
            document.getElementById("bombInputTimer").innerText = `${bombCountdown}s`;
            if (led) {
                led.innerText = formatTime(bombCountdown);
            }
            if (bombCountdown <= 2) {
                document.getElementById("bombInputTimer").style.color = "#ff3333";
                if (led) {
                    led.style.color = "#ff3333";
                    led.style.textShadow = "0 0 8px #ff0000";
                }
            } else if (bombCountdown <= 4) {
                document.getElementById("bombInputTimer").style.color = "#eab308";
                if (led) {
                    led.style.color = "#eab308";
                    led.style.textShadow = "0 0 8px #eab308";
                }
            }
        }
    }, 1000);
}

function handleBombTimeout() {
    bombInputActive = false;
    bombLives--;
    
    let hearts = "";
    for (let i = 0; i < 3; i++) {
        hearts += i < bombLives ? "❤" : "🖤";
    }
    document.getElementById("bombLives").innerText = hearts;

    playBuzzerSound();
    document.getElementById("c4LedText").innerText = "TIMEOUT";
    document.getElementById("c4LedText").style.color = "#ff3333";
    document.getElementById("c4LedText").style.textShadow = "0 0 8px #ff0000";

    if (bombLives <= 0) {
        setTimeout(() => {
            if (!bombActiveSession) return;
            finishBombGame();
        }, 500);
    } else {
        bombUserSequence = [];
        setTimeout(() => {
            if (!bombActiveSession) return;
            playSequenceToUser();
        }, 1200);
    }
}

function handleBombKeyClick(num) {
    if (!bombGameRunning || !bombInputActive) return;

    const btn = document.getElementById(`c4-key-${num}`);
    if (btn) {
        btn.classList.add("active");
        setTimeout(() => btn.classList.remove("active"), 150);
    }

    playKeyTone(num);

    const targetNum = bombSequence[bombUserSequence.length];
    if (num === targetNum) {
        bombUserSequence.push(num);
        if (bombUserSequence.length === bombSequence.length) {
            bombInputActive = false;
            if (bombCountdownInterval) {
                clearInterval(bombCountdownInterval);
                bombCountdownInterval = null;
            }
            document.getElementById("bombInputTimer").innerText = "-";
            
            bombScore += bombLevel * 150;
            bombLevel++;

            document.getElementById("c4LedText").innerText = "OK!";
            document.getElementById("c4LedText").style.color = "#22c55e";
            document.getElementById("c4LedText").style.textShadow = "0 0 8px #22c55e";
            playSuccessSound();

            setTimeout(() => {
                if (!bombActiveSession) return;
                startBombNextLevel();
            }, 1000);
        }
    } else {
        bombInputActive = false;
        if (bombCountdownInterval) {
            clearInterval(bombCountdownInterval);
            bombCountdownInterval = null;
        }
        document.getElementById("bombInputTimer").innerText = "-";
        
        bombLives--;
        
        let hearts = "";
        for (let i = 0; i < 3; i++) {
            hearts += i < bombLives ? "❤" : "🖤";
        }
        document.getElementById("bombLives").innerText = hearts;

        playBuzzerSound();
        document.getElementById("c4LedText").innerText = "ERROR";
        document.getElementById("c4LedText").style.color = "#ff3333";
        document.getElementById("c4LedText").style.textShadow = "0 0 8px #ff0000";

        if (bombLives <= 0) {
            setTimeout(() => {
                if (!bombActiveSession) return;
                finishBombGame();
            }, 500);
        } else {
            bombUserSequence = [];
            setTimeout(() => {
                if (!bombActiveSession) return;
                playSequenceToUser();
            }, 1200);
        }
    }
}

function finishBombGame() {
    bombGameRunning = false;
    if (bombTimerInterval) clearInterval(bombTimerInterval);
    playExplosionSound();

    document.getElementById("c4LedText").innerText = "BOOM!";
    document.getElementById("c4LedText").style.color = "#ff1111";

    setTimeout(() => {
        if (!bombActiveSession) return;
        document.getElementById("bombTrainerPlayground").style.display = "none";
        document.getElementById("bombGameOver").style.display = "block";

        const scoreSpan = document.getElementById("bombEndScore");
        const seqSpan = document.getElementById("bombEndSequence");
        const timeSpan = document.getElementById("bombEndTime");

        scoreSpan.innerText = `${bombScore} pts`;
        seqSpan.innerText = `Nível ${bombLevel}`;
        timeSpan.innerText = `${bombTimeElapsed}s`;

        const oldRecord = parseInt(localStorage.getItem("bomb_highscore") || "0");
        let isNewRecord = false;
        if (bombScore > oldRecord) {
            localStorage.setItem("bomb_highscore", bombScore);
            document.getElementById("bombGameHighScore").innerText = bombScore;
            isNewRecord = true;
        }

        const flash = document.getElementById("newBombHighScoreFlash");
        flash.style.display = isNewRecord ? "block" : "none";

        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        if (auth && auth.session_token) {
            fetch(`${API_URL}/update-minigame-highscore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: auth.username,
                    session_token: auth.session_token,
                    game_type: "bomb",
                    highscore: bombScore
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok" && data.updated) {
                    localStorage.setItem("bomb_highscore", data.highscore);
                    document.getElementById("bombGameHighScore").innerText = data.highscore;
                    flash.style.display = "block";
                }
            })
            .catch(err => console.error(err));
        }
    }, 1000);
}

function stopBombTrainer(finished = false) {
    bombGameRunning = false;
    bombActiveSession = false;
    bombInputActive = false;
    if (bombTimerInterval) {
        clearInterval(bombTimerInterval);
        bombTimerInterval = null;
    }
    if (bombCountdownInterval) {
        clearInterval(bombCountdownInterval);
        bombCountdownInterval = null;
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


