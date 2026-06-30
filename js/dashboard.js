// ─── Dashboard Module ─────────────────────────────────────────────────────────

let rankingTable = null;
let rankingExpanded = false;

function renderMaps() {
    const grid = document.getElementById("mapGrid");
    grid.innerHTML = "";

    maps.forEach(map => {
        const mapVotes = votes.filter(v => v.map === map);
        const card = document.createElement("div");
        card.className = "map-card";
        card.innerHTML = `
            <img src="${getMapImage(map)}" alt="${map}" onerror="this.src='img/placeholder.jpg'">
            <h3>${map}</h3>
            <p>Total votos: ${mapVotes.length}</p>
            <button onclick="openVoteModal('${map}')" ${hasAlreadyVotedForMap(map) ? "disabled" : ""}>
                ${hasAlreadyVotedForMap(map) ? "Já votado" : "Votar"}
            </button>
        `;
        grid.appendChild(card);
    });

    updateDashboard();
}

function updateDashboard() {
    document.getElementById("totalVotes").innerText = votes.length;

    if (rankingTable) { rankingTable.destroy(); rankingTable = null; }

    if (!votes.length) {
        document.getElementById("topMap").innerText = "-";
        document.getElementById("topMode").innerText = "-";
        document.getElementById("ranking").innerHTML = "<p style='color:#888;margin-top:10px'>Nenhum voto ainda.</p>";
        return;
    }

    rankingExpanded = false;
    const mapCount = {}, modeByMap = {}, weaponByMap = {}, ffByMap = {};

    votes.forEach(v => {
        mapCount[v.map] = (mapCount[v.map] || 0) + 1;
        if (!modeByMap[v.map]) modeByMap[v.map] = {};
        if (!weaponByMap[v.map]) weaponByMap[v.map] = {};
        if (!ffByMap[v.map]) ffByMap[v.map] = {};
        modeByMap[v.map][v.mode] = (modeByMap[v.map][v.mode] || 0) + 1;
        weaponByMap[v.map][v.weapon] = (weaponByMap[v.map][v.weapon] || 0) + 1;
        const ff = v.friendlyFire ?? "0";
        ffByMap[v.map][ff] = (ffByMap[v.map][ff] || 0) + 1;
    });

    const sortedMaps = Object.entries(mapCount).sort((a, b) => b[1] - a[1]);
    const topMap = sortedMaps[0][0];
    const topMode = Object.entries(modeByMap[topMap]).sort((a, b) => b[1] - a[1])[0][0];

    document.getElementById("topMap").innerText = topMap;
    document.getElementById("topMode").innerText = modeNames[topMode];

    const rows = sortedMaps.map(([map, total]) => {
        const mode   = Object.entries(modeByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const weapon = Object.entries(weaponByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const ff     = Object.entries(ffByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        return `<tr><td>${map}</td><td>${total}</td><td>${modeNames[mode]}</td><td>${weapon}</td><td>${ff === "1" ? "Com FF" : "Sem FF"}</td></tr>`;
    }).join("");

    document.getElementById("ranking").innerHTML = `
        <table id="rankingTable" class="display" style="width:100%;margin-top:12px">
            <thead><tr><th>Mapa</th><th>Votos</th><th>Modo</th><th>Arma</th><th>FF</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${sortedMaps.length > 5 ? `<button id="expandRanking" onclick="toggleRanking()" class="expand-btn"><i class="fas fa-chevron-down"></i> Ver todos (${sortedMaps.length} mapas)</button>` : ''}
    `;

    rankingTable = new DataTable("#rankingTable", {
        language: { infoEmpty: "Nenhum mapa", zeroRecords: "Nenhum resultado" },
        order: [[1, "desc"]], pageLength: 5, dom: "t"
    });
}

function toggleRanking() {
    rankingExpanded = !rankingExpanded;
    const btn = document.getElementById("expandRanking");
    if (rankingExpanded) {
        rankingTable.page.len(-1).draw();
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Mostrar menos';
    } else {
        rankingTable.page.len(5).draw();
        btn.innerHTML = `<i class="fas fa-chevron-down"></i> Ver todos (${rankingTable.rows().count()} mapas)`;
    }
}

function toggleModeInfo() {
    const panel = document.getElementById("modeInfoPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function getMapcycleContent() {
    if (!votes.length) return null;

    const mapCount = {}, modeByMap = {}, weaponByMap = {}, ffByMap = {}, timeByMap = {}, fragByMap = {};

    votes.forEach(v => {
        mapCount[v.map] = (mapCount[v.map] || 0) + 1;
        if (!modeByMap[v.map]) modeByMap[v.map] = {};
        if (!weaponByMap[v.map]) weaponByMap[v.map] = {};
        if (!ffByMap[v.map]) ffByMap[v.map] = {};
        if (!timeByMap[v.map]) timeByMap[v.map] = {};
        if (!fragByMap[v.map]) fragByMap[v.map] = {};
        modeByMap[v.map][v.mode] = (modeByMap[v.map][v.mode] || 0) + 1;
        weaponByMap[v.map][v.weapon] = (weaponByMap[v.map][v.weapon] || 0) + 1;
        const ff = v.friendlyFire ?? "0";
        ffByMap[v.map][ff] = (ffByMap[v.map][ff] || 0) + 1;
        const tl = v.timelimit !== undefined ? v.timelimit : defaultTimelimit;
        const fl = v.fraglimit !== undefined ? v.fraglimit : defaultFraglimit;
        timeByMap[v.map][tl] = (timeByMap[v.map][tl] || 0) + 1;
        fragByMap[v.map][fl] = (fragByMap[v.map][fl] || 0) + 1;
    });

    const sortedMaps = Object.entries(mapCount).sort((a, b) => b[1] - a[1]);
    let content = "";

    sortedMaps.forEach(([map]) => {
        const mostVotedMode   = Object.entries(modeByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const mostVotedWeapon = Object.entries(weaponByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const mostVotedFF     = Object.entries(ffByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const sortedTimes = Object.entries(timeByMap[map] || {}).sort((a, b) => b[1] - a[1]);
        const mostVotedTime = sortedTimes.length > 0 ? sortedTimes[0][0] : defaultTimelimit;
        const sortedFrags = Object.entries(fragByMap[map] || {}).sort((a, b) => b[1] - a[1]);
        const mostVotedFrag = sortedFrags.length > 0 ? sortedFrags[0][0] : defaultFraglimit;

        let customWeaponsArray = [];
        if (mostVotedWeapon === "Personalizadas") {
            const customConfigs = {};
            votes.filter(v => v.map === map && v.weapon === "Personalizadas").forEach(v => {
                const key = (v.customWeapons || []).sort().join("");
                customConfigs[key] = (customConfigs[key] || 0) + 1;
            });
            const entries = Object.entries(customConfigs);
            const topCustomKey = entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : "";
            customWeaponsArray = topCustomKey ? topCustomKey.split("") : [];
        }

        content += `${map}\n{\n    g_gametype ${mostVotedMode}\n    roundlimit 5\n    g_gear "${getGear(mostVotedWeapon, customWeaponsArray)}"\n    g_friendlyfire ${mostVotedFF}\n    timelimit ${mostVotedTime}\n    fraglimit ${mostVotedFrag}\n}\n\n`;
    });

    return content;
}

function downloadMapcycle() {
    const content = getMapcycleContent();
    if (!content) { showToast("warning", "Nenhum voto para gerar mapcycle."); return; }
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mapcycle.txt";
    link.click();
}

async function resetVotesManual() {
    const user = prompt("Usuário:");
    const pass = prompt("Senha:");
    if (user !== "admin" || pass !== "coco") { showToast("error", "Usuário ou senha inválidos."); return; }
    if (!confirm("Deseja realmente resetar toda a votação?")) return;

    const response = await fetch(`${API_URL}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
    });

    if (!response.ok) { showToast("error", "Erro ao resetar no servidor: " + await response.text()); return; }

    votes = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(DATE_KEY, getToday());
    renderMaps();
    showToast("success", "Votação resetada com sucesso.");
}

window.toggleRanking = toggleRanking;
window.toggleModeInfo = toggleModeInfo;
window.resetVotesManual = resetVotesManual;
