// ─── Ranking Module ──────────────────────────────────────────────────────────

let activeKillTab = "daily";

function buildKillTable(data) {
    if (!data.length) {
        return "<p style='color:#888;text-align:center;padding:20px'>Nenhum kill registrado ainda.</p>";
    }
    const rows = data.map((p, i) => {
        const kd = p.deaths === 0 ? p.kills.toFixed(2) : (p.kills / p.deaths).toFixed(2);
        const kdClass = parseFloat(kd) >= 1 ? "kd-positive" : "kd-negative";

        const avatarHtml = p.avatar
            ? `<img src="${p.avatar}" onclick="openAvatarZoom('${p.avatar_original || p.avatar}')" class="zoomable-avatar" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; object-fit:cover; cursor:pointer;">`
            : `<i class="fas fa-user-circle" style="margin-right:8px; color:#666;"></i>`;

        return `<tr>
            <td>${i + 1}</td>
            <td style="text-align:left;">
                ${avatarHtml}
                <span class="clickable-player" onclick="openProfile('${escHtml(p.player)}')">${escHtml(p.player)}</span>
            </td>
            <td>${escHtml(p.kills)}</td>
            <td>${escHtml(p.deaths)}</td>
            <td class="${kdClass}">${escHtml(kd)}</td>
            <td>${escHtml(p.topWeapon)}</td>
        </tr>`;
    }).join("");
    return `<table>
        <thead><tr><th>#</th><th>Jogador</th><th>Kills</th><th>Mortes</th><th>K/D</th><th>Arma</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

async function fetchKills(period = activeKillTab) {
    const el = document.getElementById("killPanelBody");
    try {
        const res = await fetch(`${API_URL}/kills?period=${period}`);
        const data = await res.json();
        el.innerHTML = buildKillTable(data);
    } catch (e) {
        el.innerHTML = "<p style='color:#888;text-align:center;padding:20px'>Erro ao carregar kills.</p>";
    }
}

document.getElementById("killRankingBtn").onclick = () => {
    const rankingPanel = document.getElementById("killRankingPanel");
    const isRankingOpen = rankingPanel.classList.contains("open");

    // Close history panel
    document.getElementById("historyPanel").classList.remove("open");
    const allMatchesBtn = document.getElementById("openAllMatchesBtn");
    if (allMatchesBtn) allMatchesBtn.style.display = "none";

    if (isRankingOpen) {
        rankingPanel.classList.remove("open");
    } else {
        rankingPanel.classList.add("open");
        fetchKills(activeKillTab);
    }
};

document.getElementById("killPanelClose").onclick = () => {
    document.getElementById("killRankingPanel").classList.remove("open");
};

document.querySelectorAll(".kill-tab").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".kill-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeKillTab = btn.dataset.tab;
        fetchKills(activeKillTab);
    };
});

window.fetchKills = fetchKills;
