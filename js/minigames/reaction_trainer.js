// ─── Reaction Trainer Minigame Module ────────────────────────────────────────

let reactionGameRunning = false;
let reactionAttemptCount = 0;
let reactionTimes = [];
let reactionTimerId = null;
let reactionState = "idle"; // "idle", "waiting", "ready", "showing_result"
let reactionGreenTime = 0;

function startReactionTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("reactionTrainerGame").style.display = "block";
    document.getElementById("reactionTrainerPlayground").style.display = "block";
    document.getElementById("reactionGameOver").style.display = "none";
    
    const saved = parseInt(localStorage.getItem("reaction_highscore") || "0");
    document.getElementById("reactionGameHighScore").innerText = saved > 0 ? saved : "0";
    
    resetReactionArea();
}

function resetReactionArea() {
    reactionState = "idle";
    const area = document.getElementById("reactionArea");
    area.style.background = "#ea580c";
    document.getElementById("reactionInstruction").innerText = "Clique para Iniciar";
    document.getElementById("reactionSubInstruction").innerText = "Clique na tela vermelha quando ela piscar em verde!";
    
    document.getElementById("reactionAttempt").innerText = "1 / 5";
    document.getElementById("reactionLastTime").innerText = "0 ms";
    document.getElementById("reactionAverageTime").innerText = "0 ms";
}

function startReactionTrainer() {
    reactionGameRunning = true;
    reactionAttemptCount = 0;
    reactionTimes = [];
    document.getElementById("reactionGameOver").style.display = "none";
    document.getElementById("reactionTrainerPlayground").style.display = "block";
    
    nextReactionAttempt();
}

function nextReactionAttempt() {
    reactionAttemptCount++;
    if (reactionAttemptCount > 5) {
        finishReactionTrainer();
        return;
    }
    
    document.getElementById("reactionAttempt").innerText = `${reactionAttemptCount} / 5`;
    reactionState = "waiting";
    
    const area = document.getElementById("reactionArea");
    area.style.background = "#b91c1c";
    document.getElementById("reactionInstruction").innerText = "Aguarde o sinal verde...";
    document.getElementById("reactionSubInstruction").innerText = "Não clique antes do verde!";
    
    const delay = 1500 + Math.random() * 2500;
    if (reactionTimerId) clearTimeout(reactionTimerId);
    reactionTimerId = setTimeout(() => {
        reactionState = "ready";
        area.style.background = "#22c55e";
        document.getElementById("reactionInstruction").innerText = "CLIQUE AGORA!";
        document.getElementById("reactionSubInstruction").innerText = "RÁPIDO!";
        reactionGreenTime = performance.now();
    }, delay);
}

function handleReactionClick(e) {
    if (!reactionGameRunning) {
        startReactionTrainer();
        return;
    }
    
    const area = document.getElementById("reactionArea");
    
    if (reactionState === "waiting") {
        if (reactionTimerId) clearTimeout(reactionTimerId);
        reactionState = "idle";
        area.style.background = "#b91c1c";
        document.getElementById("reactionInstruction").innerText = "Muito cedo! (Falso Começo)";
        document.getElementById("reactionSubInstruction").innerText = "Clique na tela para tentar novamente esta tentativa.";
        playMissSound();
        reactionAttemptCount--;
    } 
    else if (reactionState === "ready") {
        const diff = Math.round(performance.now() - reactionGreenTime);
        reactionTimes.push(diff);
        reactionState = "showing_result";
        
        playHitSound();
        area.style.background = "#1f2937";
        document.getElementById("reactionInstruction").innerText = `${diff} ms`;
        document.getElementById("reactionSubInstruction").innerText = "Carregando próxima tentativa...";
        
        document.getElementById("reactionLastTime").innerText = `${diff} ms`;
        
        const sum = reactionTimes.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / reactionTimes.length);
        document.getElementById("reactionAverageTime").innerText = `${avg} ms`;
        
        reactionTimerId = setTimeout(() => {
            nextReactionAttempt();
        }, 1200);
    } 
    else if (reactionState === "idle") {
        nextReactionAttempt();
    }
}

function finishReactionTrainer() {
    reactionGameRunning = false;
    if (reactionTimerId) clearTimeout(reactionTimerId);
    
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / reactionTimes.length);
    
    document.getElementById("reactionEndAverage").innerText = `${avg} ms`;
    
    document.getElementById("reactionTrainerPlayground").style.display = "none";
    document.getElementById("reactionGameOver").style.display = "block";
    
    const oldScore = parseInt(localStorage.getItem("reaction_highscore") || "0");
    let isNewRecord = false;
    if (avg > 0 && (oldScore === 0 || avg < oldScore)) {
        localStorage.setItem("reaction_highscore", avg);
        document.getElementById("reactionGameHighScore").innerText = avg;
        isNewRecord = true;
    }
    
    const flash = document.getElementById("newReactionHighScoreFlash");
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
                game_type: "reaction",
                highscore: avg
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "ok" && data.updated) {
                localStorage.setItem("reaction_highscore", data.highscore);
                document.getElementById("reactionGameHighScore").innerText = data.highscore;
                flash.style.display = "block";
            }
        })
        .catch(err => console.error("Erro ao salvar recorde no banco:", err));
    }
}

function stopReactionTrainer(finished = false) {
    reactionGameRunning = false;
    reactionState = "idle";
    if (reactionTimerId) {
        clearTimeout(reactionTimerId);
        reactionTimerId = null;
    }
}

document.getElementById("reactionArea").onclick = handleReactionClick;
