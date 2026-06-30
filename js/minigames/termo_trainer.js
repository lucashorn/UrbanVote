// ─── Termo Terror Minigame Module (Wordle Clone) ──────────────────────────────

let termoGameRunning = false;
let termoActiveSession = false;
let termoSecretWord = "";
let termoCurrentRow = 0;
let termoCurrentCol = 0;
let termoStreak = 0;
const termoWordsList = [
    "BOMBA", "SLIDE", "MEDIC", "LASER", "SMOKE", 
    "ABBEY", "PARIS", "RADIO", "JUMPS", "SHOTS", 
    "ARMAS", "RIVAL", "PLACA", "KILLS", "DEATH", 
    "ADMIN", "VOTOS", "SOUND", "FOGO", "TERRA", 
    "AMIGO", "TEMPO", "CORPO", "JOGOS", "GRUPO", 
    "PRETO", "FORTE", "SIGLA", "PODER", "UNIAO", 
    "CAMPO", "ROUND", "CLUBE", "ARENA", "URBAN",
    "PORTA", "PEDRA", "CHAVE", "LINHA", "PONTO",
    "GOLPE", "SANGU", "MURAL", "FAROL", "PULSO"
];

function startTermoTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("termoTrainerGame").style.display = "block";
    document.getElementById("termoTrainerSetup").style.display = "block";
    document.getElementById("termoTrainerPlayground").style.display = "none";
    document.getElementById("termoGameOver").style.display = "none";

    const saved = parseInt(localStorage.getItem("termo_highscore") || "0");
    document.getElementById("termoGameHighScore").innerText = saved;
    termoStreak = parseInt(localStorage.getItem("termo_current_streak") || "0");
}

function updateTermoCellSelection() {
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.getElementById(`termo-cell-${r}-${c}`);
            if (cell) {
                cell.classList.remove("selected");
                if (r === termoCurrentRow && termoGameRunning) {
                    cell.classList.add("clickable");
                } else {
                    cell.classList.remove("clickable");
                }
            }
        }
    }
    if (termoGameRunning && termoCurrentCol >= 0 && termoCurrentCol < 5) {
        const cell = document.getElementById(`termo-cell-${termoCurrentRow}-${termoCurrentCol}`);
        if (cell) {
            cell.classList.add("selected");
        }
    }
}

function setupTermoGrid() {
    const grid = document.getElementById("termoGrid");
    grid.innerHTML = "";
    for (let r = 0; r < 6; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "termo-grid-row";
        rowDiv.id = `termo-row-${r}`;
        for (let c = 0; c < 5; c++) {
            const cellDiv = document.createElement("div");
            cellDiv.className = "termo-cell";
            cellDiv.id = `termo-cell-${r}-${c}`;
            cellDiv.innerText = "";
            
            cellDiv.onclick = () => {
                if (termoGameRunning && r === termoCurrentRow) {
                    termoCurrentCol = c;
                    updateTermoCellSelection();
                }
            };
            
            rowDiv.appendChild(cellDiv);
        }
        grid.appendChild(rowDiv);
    }
}

function setupTermoKeyboard() {
    const keyboard = document.getElementById("termoKeyboard");
    keyboard.innerHTML = "";
    const rows = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç"],
        ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "APAGAR"]
    ];

    rows.forEach((row, rowIndex) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "termo-kbd-row";
        row.forEach(key => {
            const btn = document.createElement("button");
            btn.className = "termo-key";
            btn.innerText = key;
            btn.setAttribute("data-key", key);
            if (key === "ENTER" || key === "APAGAR") {
                btn.classList.add("wide");
            }
            btn.onclick = () => handleTermoInput(key);
            rowDiv.appendChild(btn);
        });
        keyboard.appendChild(rowDiv);
    });
}

async function startTermoTrainer() {
    termoActiveSession = true;
    termoCurrentRow = 0;
    termoCurrentCol = 0;
    
    const fallbackIdx = Math.floor(Math.random() * termoWordsList.length);
    termoSecretWord = termoWordsList[fallbackIdx].toUpperCase();

    setupTermoGrid();
    setupTermoKeyboard();
    updateTermoCellSelection();

    document.getElementById("termoGameOver").style.display = "none";
    document.getElementById("termoTrainerSetup").style.display = "none";
    document.getElementById("termoTrainerPlayground").style.display = "block";

    termoGameRunning = true; 

    try {
        const response = await fetch("/random-word");
        const data = await response.json();
        termoSecretWord = data.word.toUpperCase();
    } catch (e) {
        console.error("Erro ao obter palavra secreta:", e);
    }

}

function handleTermoInput(key) {
    if (!termoGameRunning) {
        if (document.getElementById("termoGameOver").style.display === "block") {
            startTermoTrainer();
        }
        return;
    }

    if (key === "APAGAR" || key === "BACKSPACE") {
        const currentCell = document.getElementById(`termo-cell-${termoCurrentRow}-${termoCurrentCol}`);
        if (currentCell && currentCell.innerText !== "") {
            currentCell.innerText = "";
            currentCell.classList.remove("pop");
        } else {
            if (termoCurrentCol > 0) {
                termoCurrentCol--;
                const prevCell = document.getElementById(`termo-cell-${termoCurrentRow}-${termoCurrentCol}`);
                if (prevCell) {
                    prevCell.innerText = "";
                    prevCell.classList.remove("pop");
                }
            }
        }
        updateTermoCellSelection();
    } 
    else if (key === "ENTER") {
        let isFull = true;
        for (let c = 0; c < 5; c++) {
            const val = document.getElementById(`termo-cell-${termoCurrentRow}-${c}`).innerText;
            if (!val) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            submitTermoGuess();
        } else {
            const row = document.getElementById(`termo-row-${termoCurrentRow}`);
            row.classList.add("shake");
            playMissSound();
            setTimeout(() => row.classList.remove("shake"), 400);
        }
    } 
    else if (/^[A-ZÇ]$/i.test(key)) {
        if (termoCurrentCol < 5) {
            const cell = document.getElementById(`termo-cell-${termoCurrentRow}-${termoCurrentCol}`);
            if (cell) {
                cell.innerText = key.toUpperCase();
                cell.classList.add("pop");
                termoCurrentCol++;
                updateTermoCellSelection();
            }
        }
    }
}

document.addEventListener("keydown", (e) => {
    if (document.getElementById("termoTrainerGame") && document.getElementById("termoTrainerGame").style.display === "block" && termoGameRunning) {
        let key = e.key.toUpperCase();
        if (key === "BACKSPACE") {
            handleTermoInput("APAGAR");
        } else if (key === "ENTER") {
            handleTermoInput("ENTER");
        } else if (key === "ARROWLEFT") {
            if (termoCurrentCol > 0) {
                termoCurrentCol--;
                updateTermoCellSelection();
            }
        } else if (key === "ARROWRIGHT") {
            if (termoCurrentCol < 4) {
                termoCurrentCol++;
                updateTermoCellSelection();
            }
        } else if (/^[A-ZÇ]$/i.test(key)) {
            handleTermoInput(key);
        }
    }
});

async function submitTermoGuess() {
    let guess = "";
    for (let c = 0; c < 5; c++) {
        guess += document.getElementById(`termo-cell-${termoCurrentRow}-${c}`).innerText;
    }

    const row = document.getElementById(`termo-row-${termoCurrentRow}`);
    
    termoGameRunning = false;
    updateTermoCellSelection();
    
    let isValid = false;
    try {
        const response = await fetch("/validate-word", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ word: guess })
        });
        const data = await response.json();
        isValid = data.valid;
    } catch (e) {
        console.error("Erro ao validar palavra:", e);
        isValid = true; 
    }

    if (!isValid) {
        row.classList.add("shake");
        playMissSound();
        showToast("warning", "Palavra não existe no dicionário!");
        setTimeout(() => {
            if (!termoActiveSession) return;
            row.classList.remove("shake");
            termoGameRunning = true;
            updateTermoCellSelection();
        }, 400);
        return;
    }

    const secretLetterCount = {};
    for (let i = 0; i < 5; i++) {
        const char = termoSecretWord[i];
        secretLetterCount[char] = (secretLetterCount[char] || 0) + 1;
    }

    const cellStatuses = Array(5).fill("absent");
    
    for (let i = 0; i < 5; i++) {
        if (guess[i] === termoSecretWord[i]) {
            cellStatuses[i] = "correct";
            secretLetterCount[guess[i]]--;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (cellStatuses[i] !== "correct") {
            const char = guess[i];
            if (secretLetterCount[char] && secretLetterCount[char] > 0) {
                cellStatuses[i] = "present";
                secretLetterCount[char]--;
            }
        }
    }

    for (let c = 0; c < 5; c++) {
        const cell = document.getElementById(`termo-cell-${termoCurrentRow}-${c}`);
        const status = cellStatuses[c];
        const letter = guess[c];

        setTimeout(() => {
            if (!termoActiveSession) return;
            cell.classList.add("flip");
            setTimeout(() => {
                if (!termoActiveSession) return;
                cell.classList.remove("flip");
                cell.classList.add(status);
                
                const kbdKey = document.querySelector(`.termo-key[data-key="${letter}"]`);
                if (kbdKey) {
                    if (status === "correct") {
                        kbdKey.classList.remove("present", "absent");
                        kbdKey.classList.add("correct");
                    } else if (status === "present" && !kbdKey.classList.contains("correct")) {
                        kbdKey.classList.remove("absent");
                        kbdKey.classList.add("present");
                    } else if (status === "absent" && !kbdKey.classList.contains("correct") && !kbdKey.classList.contains("present")) {
                        kbdKey.classList.add("absent");
                    }
                }
                
                if (c === 4) {
                    termoGameRunning = true;
                    if (guess === termoSecretWord) {
                        finishTermoGame(true);
                    } else if (termoCurrentRow === 5) {
                        finishTermoGame(false);
                    } else {
                        termoCurrentRow++;
                        termoCurrentCol = 0;
                    }
                }
            }, 120);
        }, c * 200);
    }
}

function finishTermoGame(won) {
    termoGameRunning = false;
    document.getElementById("termoTrainerPlayground").style.display = "none";
    document.getElementById("termoGameOver").style.display = "block";
    document.getElementById("termoSecretWordReveal").innerText = termoSecretWord;

    const title = document.getElementById("termoGameOverTitle");
    const attemptsSpan = document.getElementById("termoEndAttempts");
    const streakSpan = document.getElementById("termoEndStreak");
    const scoreSpan = document.getElementById("termoEndScore");

    let score = 0;
    if (won) {
        playSuccessSound();
        title.innerText = "Você Venceu!";
        title.style.color = "#22c55e";
        attemptsSpan.innerText = `${termoCurrentRow + 1} / 6`;
        score = (6 - termoCurrentRow) * 100;
        termoStreak++;
    } else {
        playMissSound();
        title.innerText = "Fim de Jogo!";
        title.style.color = "#ff3333";
        attemptsSpan.innerText = "Fracassou";
        score = 0;
        termoStreak = 0;
    }

    localStorage.setItem("termo_current_streak", termoStreak);
    streakSpan.innerText = termoStreak;
    scoreSpan.innerText = `${score} pts`;

    const oldRecord = parseInt(localStorage.getItem("termo_highscore") || "0");
    let isNewRecord = false;
    if (termoStreak > oldRecord) {
        localStorage.setItem("termo_highscore", termoStreak);
        document.getElementById("termoGameHighScore").innerText = termoStreak;
        isNewRecord = true;
    }

    const flash = document.getElementById("newTermoHighScoreFlash");
    flash.style.display = isNewRecord ? "block" : "none";

    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (auth && auth.session_token) {
        fetch(`${API_URL}/update-minigame-highscore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: auth.username,
                session_token: auth.session_token,
                game_type: "termo",
                highscore: termoStreak
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "ok" && data.updated) {
                localStorage.setItem("termo_highscore", data.highscore);
                document.getElementById("termoGameHighScore").innerText = data.highscore;
                flash.style.display = "block";
            }
        })
        .catch(err => console.error(err));
    }
}

function stopTermoTrainer(finished = false) {
    termoGameRunning = false;
    termoActiveSession = false;
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

