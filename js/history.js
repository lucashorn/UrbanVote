// ─── Match History Module ────────────────────────────────────────────────────

let matchHistory = [];

document.getElementById("historyBtn").onclick = async () => {
    const historyPanel = document.getElementById("historyPanel");
    const isHistoryOpen = historyPanel.classList.contains("open");

    // Close ranking panel
    document.getElementById("killRankingPanel").classList.remove("open");

    if (isHistoryOpen) {
        historyPanel.classList.remove("open");
        const allMatchesBtn = document.getElementById("openAllMatchesBtn");
        if (allMatchesBtn) allMatchesBtn.style.display = "none";
    } else {
        historyPanel.classList.add("open");
        const el = document.getElementById("historyPanelBody");
        try {
            const res = await fetch(`${API_URL}/history`);
            const data = await res.json();
            matchHistory = data;
            const allMatchesBtn = document.getElementById("openAllMatchesBtn");
            if (allMatchesBtn) {
                if (matchHistory.length > 15) {
                    allMatchesBtn.innerText = `Ver Tudo (${matchHistory.length})`;
                    allMatchesBtn.style.display = "inline-block";
                } else {
                    allMatchesBtn.style.display = "none";
                }
            }
            if (!matchHistory.length) {
                el.innerHTML = "<p style='color:#888;text-align:center;'>Nenhum histórico ainda.</p>";
                return;
            }

            const displayedHistory = matchHistory.slice(-15);
            let itemsHtml = displayedHistory.slice().reverse().map((h, revIndex) => {
                const originalIndex = matchHistory.length - 1 - revIndex;
                return `
            <div class="history-item" onclick="openMatchScoreboard(${originalIndex})" style="cursor: pointer;">
                <img class="history-item-img" src="${getMapImage(h.map)}" onerror="this.src='img/placeholder.jpg'">
                <div class="history-item-content">
                    <div class="history-item-left">
                        <h4 style="margin:0; color:#ffaa00">${escHtml(h.map)}</h4>
                        <small style="color:#888">${escHtml(formatDateToBR(h.date))}</small>
                    </div>
                    <div class="history-item-right">
                        <span style="color:#00ffcc; font-weight:bold">${escHtml(h.mvp)}</span><br>
                        <small style="color:#888">${escHtml(h.kills)} kills</small>
                    </div>
                </div>
            </div>
            `;
            }).join("");

            el.innerHTML = itemsHtml;
        } catch (e) {
            el.innerHTML = "<p style='color:#ff3333;'>Erro ao carregar histórico.</p>";
        }
    }
};

document.getElementById("historyPanelClose").onclick = () => {
    document.getElementById("historyPanel").classList.remove("open");
    const allMatchesBtn = document.getElementById("openAllMatchesBtn");
    if (allMatchesBtn) allMatchesBtn.style.display = "none";
};

// Scoreboard Modal
function openMatchScoreboard(index) {
    const h = matchHistory[index];
    if (!h) return;

    const modal = document.getElementById("matchScoreboardModal");
    const mapNameEl = document.getElementById("scoreboardMapName");
    const matchDateEl = document.getElementById("scoreboardMatchDate");
    const container = document.getElementById("scoreboardTableContainer");

    mapNameEl.innerText = h.map;
    matchDateEl.innerText = formatDateToBR(h.date);

    container.innerHTML = buildScoreboardTable(h.scoreboard);
    modal.style.display = "flex";
}

function buildScoreboardTable(scoreboard) {
    if (!scoreboard || !scoreboard.length) {
        return "<p style='color:#888;text-align:center;padding:20px'>Placar não disponível para esta partida antiga.</p>";
    }
    const rows = scoreboard.map((p, i) => {
        const kd = p.deaths === 0 ? p.kills.toFixed(2) : (p.kills / p.deaths).toFixed(2);
        const kdClass = parseFloat(kd) >= 1 ? "kd-positive" : "kd-negative";

        const avatarHtml = p.avatar
            ? `<img src="${p.avatar}" onclick="event.stopPropagation(); openAvatarZoom('${p.avatar_original || p.avatar}')" class="zoomable-avatar" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; object-fit:cover; cursor:pointer;">`
            : `<i class="fas fa-user-circle" style="margin-right:8px; color:#666;"></i>`;

        return `<tr>
            <td>${i + 1}</td>
            <td style="text-align:left;">
                ${avatarHtml}
                <span class="clickable-player" onclick="event.stopPropagation(); openProfile('${escHtml(p.player)}')">${escHtml(p.player)}</span>
            </td>
            <td>${escHtml(p.kills)}</td>
            <td>${escHtml(p.deaths)}</td>
            <td class="${kdClass}">${escHtml(kd)}</td>
        </tr>`;
    }).join("");
    return `<table class="scoreboard-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Jogador</th>
                <th>Kills</th>
                <th>Mortes</th>
                <th>K/D</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

document.getElementById("matchScoreboardClose").onclick = () => {
    document.getElementById("matchScoreboardModal").style.display = "none";
};

// All Matches Modal
function openAllMatchesModal() {
    const modal = document.getElementById("allMatchesModal");
    const container = document.getElementById("allMatchesGridContainer");

    container.innerHTML = matchHistory.slice().reverse().map((h, revIndex) => {
        const originalIndex = matchHistory.length - 1 - revIndex;
        return `
        <div class="grid-match-item" onclick="openMatchScoreboard(${originalIndex})">
            <img class="grid-match-img" src="${getMapImage(h.map)}" onerror="this.src='img/placeholder.jpg'">
            <div class="grid-match-content">
                <div>
                    <h4>${escHtml(h.map)}</h4>
                    <p>${escHtml(formatDateToBR(h.date))}</p>
                </div>
                <div class="grid-match-mvp">
                    <span>${escHtml(h.mvp)}</span>
                    <span style="color:#aaa; font-weight:normal; font-size:0.9em;">${escHtml(h.kills)} kills</span>
                </div>
            </div>
        </div>
        `;
    }).join("");

    modal.style.display = "flex";
}

document.getElementById("allMatchesClose").onclick = () => {
    document.getElementById("allMatchesModal").style.display = "none";
};

window.openMatchScoreboard = openMatchScoreboard;
window.openAllMatchesModal = openAllMatchesModal;
