function generateBrowserId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

const browserId = localStorage.getItem("browserId") || generateBrowserId();

localStorage.setItem("browserId", browserId);

const maps = [
    "ut4_abbey", "ut4_algiers",
    "ut4_austria", "ut4_bohemia", "ut4_casa", "ut4_cascade", "ut4_docks",
    "ut4_dressingroom", "ut4_eagle", "ut4_firingrange", "ut4_elgin", "ut4_ghosttown",
    "ut4_herring", "ut4_killroom", "ut4_kingdom", "ut4_kingpin",
    "ut4_mandolin", "ut4_mykonos_a17", "ut4_oildepot", "ut4_paris", "ut4_prague", "ut4_prominence",
    "ut4_raiders", "ut4_ramelle", "ut4_ricochet", "ut4_riyadh",
    "ut4_sanc", "ut4_suburbs", "ut4_subway",
    "ut4_swim", "ut4_thingley", "ut4_tombs",
    "ut4_turnpike", "ut4_uptown"
];

const modeNames = {
    1: "LMS - Last Man Standing",
    2: "FFA - Free for All",
    3: "TDM - Team Deathmatch",
    4: "TS - Team Survivor",
    5: "FTL - Follow the Leader",
    6: "CNH - Capture & Hold",
    7: "CTF - Capture the Flag",
    8: "BM - Bomb & Defuse",
    9: "JUMP - Jump Mode",
    10: "FT - Freeze Tag",
    11: "GUN - Gun Game"
};

const STORAGE_KEY = "urban_votes";
const DATE_KEY = "urban_vote_date";
const API_URL = "http://192.168.128.102:8085";

let votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let selectedMap = null;
let selectedMode = "4";
let selectedWeapon = "Todas as armas";
let selectedFriendlyFire = "0";
let rankingTable = null;
let rankingExpanded = false;

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function resetDailyVotes() {
    const savedDate = localStorage.getItem(DATE_KEY);

    if (savedDate !== getToday()) {
        votes = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        localStorage.setItem(DATE_KEY, getToday());
    }
}

function hasAlreadyVotedForMap(map) {
    return votes.some(v =>
        v.map === map &&
        v.date === getToday() &&
        v.browserId === browserId
    );
}

const customWeaponGroups = {
    "Pistolas": {
        "F": "Beretta 92FS",
        "G": ".50 Desert Eagle",
        "f": "Glock",
        "g": "Colt 1911",
        "l": "Magnum"
    },
    "Submetralhadoras & LMG": {
        "I": "MP5K",
        "J": "UMP45",
        "h": "MAC11",
        "k": "P90",
        "c": "Negev LMG"
    },
    "Fuzis de Assalto": {
        "L": "LR300ML",
        "M": "G36",
        "a": "AK-103",
        "e": "Colt M4A1"
    },
    "Snipers": {
        "N": "PSG-1",
        "Z": "SR8",
        "i": "FRF1"
    },
    "Shotguns & Explosivos": {
        "H": "SPAS 12",
        "j": "Benelli",
        "K": "HK69"
    },
    "Granadas": {
        "O": "HE Grenade",
        "Q": "Smoke Grenade"
    },
    "Itens / Equipamentos": {
        "R": "Kevlar Vest",
        "W": "Helmet",
        "T": "Medkit",
        "X": "Extra Ammo",
        "U": "Silencer",
        "V": "Laser Sight",
        "S": "Goggles"
    }
};

const weaponImages = {
    "Beretta": "beretta", "Beretta 92FS": "beretta",
    "Desert Eagle": "deagle", ".50 Desert Eagle": "deagle",
    "SPAS": "spas12", "SPAS 12": "spas12",
    "MP5K": "mp5k",
    "UMP45": "ump45",
    "HK69": "hk69",
    "LR300": "lr300", "LR300ML": "lr300",
    "G36": "g36",
    "PSG-1": "psg1", "PSG1": "psg1",
    "HE Grenade": "hegrenade",
    "Knife": "knife",
    "Smoke Grenade": "smokegrenade",
    "Kevlar Vest": "vest",
    "Goggles": "goggles",
    "Medkit": "medkit",
    "Silencer": "silencer",
    "Laser": "laser", "Laser Sight": "laser",
    "Helmet": "helmet",
    "Extra Ammo": "extraammo",
    "SR8": "sr8",
    "AK-103": "ak103",
    "Negev": "negev", "Negev LMG": "negev",
    "M4A1": "m4a1", "Colt M4A1": "m4a1",
    "Glock": "glock",
    "Colt 1911": "colt1911",
    "MAC11": "mac11",
    "FRF1": "frf1",
    "Benelli": "benelli",
    "P90": "p90",
    "Magnum": "magnum"
};

const customWeaponMapping = {};
Object.values(customWeaponGroups).forEach(group => Object.assign(customWeaponMapping, group));

const OFFICIAL_GEAR_ORDER = "FGHIJKLMNZacefghijklOQRSTUVWX";

let selectedCustomWeapons = Object.keys(customWeaponMapping);

function openCustomWeaponsModal() {
    const list = document.getElementById("customWeaponsList");
    list.innerHTML = "";

    Object.entries(customWeaponGroups).forEach(([groupName, weapons]) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "custom-weapon-group";

        const groupTitle = document.createElement("h3");
        groupTitle.innerText = groupName;
        groupTitle.className = "custom-weapon-group-title";
        groupDiv.appendChild(groupTitle);

        const groupGrid = document.createElement("div");
        groupGrid.className = "custom-weapons-subgrid";

        Object.entries(weapons).forEach(([letter, name]) => {
            const label = document.createElement("label");
            label.className = "custom-weapon-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = letter;
            checkbox.checked = selectedCustomWeapons.includes(letter);

            checkbox.onchange = (e) => {
                if (e.target.checked) {
                    if (!selectedCustomWeapons.includes(letter)) selectedCustomWeapons.push(letter);
                } else {
                    selectedCustomWeapons = selectedCustomWeapons.filter(l => l !== letter);
                }
            };

            label.appendChild(checkbox);
            
            const slug = weaponImages[name];
            if (slug) {
                const img = document.createElement("img");
                img.src = `weapons/${slug}.webp`;
                img.style.width = "40px";
                img.style.height = "auto";
                img.style.margin = "0 8px";
                img.style.pointerEvents = "none";
                label.appendChild(img);
            }

            label.appendChild(document.createTextNode(name));
            groupGrid.appendChild(label);
        });

        groupDiv.appendChild(groupGrid);
        list.appendChild(groupDiv);
    });

    document.getElementById("customWeaponsModal").style.display = "flex";
}

function closeCustomWeaponsModal(accepted) {
    document.getElementById("customWeaponsModal").style.display = "none";
    if (!accepted) {
        document.querySelectorAll(".weapon-btn").forEach(b => {
            if (b.dataset.weapon === previousWeapon) {
                b.classList.add("active");
                selectedWeapon = previousWeapon;
            } else {
                b.classList.remove("active");
            }
        });
    }
}

function getGear(weapon, customWeaponsArray = []) {
    if (weapon === "Todas as armas") {
        return "0";
    }

    let allowed = [];
    if (weapon === "Somente Sniper") {
        allowed = Object.keys(customWeaponGroups["Snipers"]);
    } else if (weapon === "Somente Pistola") {
        allowed = Object.keys(customWeaponGroups["Pistolas"]);
    } else if (weapon === "Somente Granada") {
        // Permitir HK69 (K), HE Grenade (O) e Smoke Grenade (Q)
        allowed = ["K", "O", "Q"];
    } else if (weapon === "Personalizadas") {
        allowed = customWeaponsArray;
    }

    // Cálculo dinâmico: Percorre a sequência oficial e remove o que for permitido
    let gearStr = "";
    OFFICIAL_GEAR_ORDER.split("").forEach(letter => {
        if (!allowed.includes(letter)) {
            gearStr += letter;
        }
    });

    return gearStr || "0";
}

/*
    Gera link da thumbnail real da wiki
*/
const mapImages = {
    "ut4_abbey": "Abbey.jpg",
    "ut4_algiers": "Algiers.jpg",
    "ut4_austria": "Austria.jpg",
    "ut4_bohemia": "Bohemia.jpg",
    "ut4_casa": "Casa.jpg",
    "ut4_cascade": "Cascade.jpg",
    "ut4_docks": "Docks.jpg",
    "ut4_dressingroom": "Dressingroom.jpg",
    "ut4_eagle": "Eagle.jpg",
    "ut4_firingrange": "Firingrange.jpg",
    "ut4_elgin": "Elgin.jpg",
    "ut4_herring": "Herring.jpg",
    "ut4_ghosttown": "Ghosttown.jpg",
    "ut4_killroom": "Killroom.jpg",
    "ut4_kingdom": "Kingdom.jpg",
    "ut4_kingpin": "Kingpin.jpg",
    "ut4_mandolin": "Mandolin.jpg",
    "ut4_mykonos_a17": "Mykonos.jpg",
    "ut4_oildepot": "Oildepot.jpg",
    "ut4_paris": "Paris.jpg",
    "ut4_prague": "Prague.jpg",
    "ut4_prominence": "Prominence.jpg",
    "ut4_raiders": "Raiders.jpg",
    "ut4_ramelle": "Ramelle.jpg",
    "ut4_ricochet": "Ricochet.jpg",
    "ut4_riyadh": "Riyadh.jpg",
    "ut4_sanc": "Sanc.jpg",
    "ut4_suburbs": "Suburbs.jpg",
    "ut4_subway": "Subway.jpg",
    "ut4_swim": "Swim.jpg",
    "ut4_thingley": "Thingley.jpg",
    "ut4_tombs": "Tombs.jpg",
    "ut4_turnpike": "Turnpike.jpg",
    "ut4_uptown": "Uptown.jpg"
};

function getMapImage(map) {
    return `img/${mapImages[map] || "placeholder.jpg"}`;
}

function renderMaps() {
    const grid = document.getElementById("mapGrid");
    grid.innerHTML = "";

    maps.forEach(map => {
        const mapVotes = votes.filter(v => v.map === map);

        const card = document.createElement("div");
        card.className = "map-card";

        card.innerHTML = `
            <img
                src="${getMapImage(map)}"
                alt="${map}"
                onerror="this.src='img/placeholder.jpg'"
            >
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

function renderModeButtons() {
    const container = document.getElementById("modeButtons");
    container.innerHTML = "";

    Object.entries(modeNames).forEach(([value, label]) => {
        const btn = document.createElement("button");
        btn.className = "mode-btn";
        btn.innerText = label;

        if (value === selectedMode) {
            btn.classList.add("active");
        }

        btn.onclick = () => {
            document.querySelectorAll(".mode-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
            selectedMode = value;
        };

        container.appendChild(btn);
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

let previousWeapon = "Todas as armas"; // default

function setupWeaponButtons() {
    document.querySelectorAll(".weapon-btn").forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.weapon !== "Personalizadas") {
                previousWeapon = btn.dataset.weapon;
            }

            document.querySelectorAll(".weapon-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
            selectedWeapon = btn.dataset.weapon;
            if (selectedWeapon === "Personalizadas") {
                openCustomWeaponsModal();
            }
        };
    });
}

function setupFriendlyFireButtons() {
    document.querySelectorAll(".ff-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".ff-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
            selectedFriendlyFire = btn.dataset.ff;
        };
    });
}

function openVoteModal(map) {
    if (hasAlreadyVotedForMap(map)) {
        alert("Você já votou neste mapa hoje.");
        return;
    }

    selectedMap = map;
    selectedMode = "4";
    selectedWeapon = "Todas as armas";
    selectedFriendlyFire = "0";

    document.getElementById("modeInfoPanel").style.display = "none";
    document.getElementById("modalMapName").innerText = map;

    renderModeButtons();

    document.querySelectorAll(".weapon-btn")
        .forEach(b => b.classList.remove("active"));

    document.querySelector('[data-weapon="Todas as armas"]')
        .classList.add("active");

    document.querySelectorAll(".ff-btn")
        .forEach(b => b.classList.remove("active"));

    document.querySelector('[data-ff="0"]')
        .classList.add("active");

    document.getElementById("voteModal").style.display = "flex";
}

async function confirmVote() {
    const response = await fetch(`${API_URL}/vote`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            browserId,
            map: selectedMap,
            mode: selectedMode,
            weapon: selectedWeapon,
            customWeapons: selectedWeapon === "Personalizadas" ? selectedCustomWeapons : [],
            friendlyFire: selectedFriendlyFire
        })
    });

    if (!response.ok) {
        alert(await response.text());
        return;
    }

    document.getElementById("voteModal").style.display = "none";

    await fetchVotes();
}

async function fetchVotes() {
    const response = await fetch(`${API_URL}/votes`);
    votes = await response.json();

    renderMaps();
}

function updateDashboard() {
    document.getElementById("totalVotes").innerText = votes.length;

    if (rankingTable) {
        rankingTable.destroy();
        rankingTable = null;
    }

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
        const mode = Object.entries(modeByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const weapon = Object.entries(weaponByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const ff = Object.entries(ffByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        return `<tr>
            <td>${map}</td>
            <td>${total}</td>
            <td>${modeNames[mode]}</td>
            <td>${weapon}</td>
            <td>${ff === "1" ? "Com FF" : "Sem FF"}</td>
        </tr>`;
    }).join("");

    document.getElementById("ranking").innerHTML = `
        <table id="rankingTable" class="display" style="width:100%;margin-top:12px">
            <thead><tr>
                <th>Mapa</th><th>Votos</th><th>Modo</th><th>Arma</th><th>FF</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${sortedMaps.length > 5 ? `<button id="expandRanking" onclick="toggleRanking()" class="expand-btn"><i class="fas fa-chevron-down"></i> Ver todos (${sortedMaps.length} mapas)</button>` : ''}
    `;

    rankingTable = new DataTable("#rankingTable", {
        language: {
            infoEmpty: "Nenhum mapa",
            zeroRecords: "Nenhum resultado"
        },
        order: [[1, "desc"]],
        pageLength: 5,
        dom: "t"
    });
}

function getMapcycleContent() {
    if (!votes.length) {
        return null;
    }

    const mapCount = {};
    const modeByMap = {};
    const weaponByMap = {};
    const ffByMap = {};

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

    let content = "";

    sortedMaps.forEach(([map]) => {
        const mostVotedMode = Object.entries(modeByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const mostVotedWeapon = Object.entries(weaponByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const mostVotedFF = Object.entries(ffByMap[map]).sort((a, b) => b[1] - a[1])[0][0];

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

        content += `${map}\n{\n    g_gametype ${mostVotedMode}\n    roundlimit 5\n    g_gear "${getGear(mostVotedWeapon, customWeaponsArray)}"\n    g_friendlyfire ${mostVotedFF}\n}\n\n`;
    });

    return content;
}

function downloadMapcycle() {
    const content = getMapcycleContent();
    if (!content) {
        alert("Nenhum voto para gerar mapcycle.");
        return;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mapcycle.txt";
    link.click();
}

async function updateServerStatus() {
    try {
        const response = await fetch(`${API_URL}/server-live`);
        const data = await response.json();
        const dot = document.getElementById("serverStatusDot");
        const text = document.getElementById("serverStatusText");
        const startBtn = document.getElementById("startServerBtn");
        const stopBtn = document.getElementById("stopServerBtn");
        const details = document.getElementById("liveStatusDetails");
        const mapNameSpan = document.getElementById("liveMapName");
        const playerCountSpan = document.getElementById("livePlayerCount");
        const playerListDiv = document.getElementById("livePlayerList");

        if (data.running) {
            dot.className = "status-dot online";
            text.innerText = "Servidor Online";
            startBtn.style.display = "none";
            stopBtn.style.display = "inline-block";
            
            details.style.display = "block";
            mapNameSpan.innerText = data.map || "Desconhecido";
            playerCountSpan.innerText = `${data.players.length}/12`;
            
            if (data.players.length === 0) {
                playerListDiv.innerHTML = "<p style='color:#888; font-size:0.9em;'>Nenhum jogador online.</p>";
            } else {
                playerListDiv.innerHTML = data.players.map(p => `
                    <div class="live-player">
                        <span class="live-player-name clickable-player" onclick="openProfile('${escHtml(p.name)}')">${escHtml(p.name)}</span>
                        <span>
                            <span style="color:#fff; margin-right:5px;">${escHtml(p.score)} pts</span>
                            <span class="live-player-ping">${escHtml(p.ping)}ms</span>
                        </span>
                    </div>
                `).join("");
            }
        } else {
            dot.className = "status-dot offline";
            text.innerText = "Servidor Offline";
            startBtn.style.display = "inline-block";
            stopBtn.style.display = "none";
            details.style.display = "none";
        }
        return data.running;
    } catch (e) {
        console.error("Erro ao verificar status do servidor:", e);
        return false;
    }
}

async function startServer() {
    const content = getMapcycleContent();
    if (!content) {
        alert("Nenhum voto para gerar mapcycle.");
        return;
    }

    const btn = document.getElementById("startServerBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';

    try {
        const response = await fetch(`${API_URL}/server-start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mapcycle: content })
        });

        if (response.ok) {
            // Poll for status until it's online or timeout
            let attempts = 0;
            const maxAttempts = 15;
            const poll = setInterval(async () => {
                const isOnline = await updateServerStatus();
                attempts++;
                if (isOnline || attempts >= maxAttempts) {
                    clearInterval(poll);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }, 1000);
        } else {
            alert("Erro ao iniciar servidor: " + await response.text());
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        alert("Erro na requisição: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function stopServer() {
    if (!confirm("Deseja realmente parar o servidor?")) return;

    const btn = document.getElementById("stopServerBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parando...';

    try {
        const response = await fetch(`${API_URL}/server-stop`, {
            method: "POST"
        });

        if (response.ok) {
            // Poll for status until it's offline or timeout
            let attempts = 0;
            const maxAttempts = 10;
            const poll = setInterval(async () => {
                const isOnline = await updateServerStatus();
                attempts++;
                if (!isOnline || attempts >= maxAttempts) {
                    clearInterval(poll);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }, 1000);
        } else {
            alert("Erro ao parar servidor: " + await response.text());
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        alert("Erro na requisição: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function resetVotesManual() {
    const user = prompt("Usuário:");
    const pass = prompt("Senha:");

    if (user !== "admin" || pass !== "coco") {
        alert("Usuário ou senha inválidos.");
        return;
    }

    const confirmReset = confirm("Deseja realmente resetar toda a votação?");

    if (!confirmReset) {
        return;
    }

    const response = await fetch(`${API_URL}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
    });

    if (!response.ok) {
        alert("Erro ao resetar no servidor: " + await response.text());
        return;
    }

    votes = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(DATE_KEY, getToday());

    renderMaps();
    alert("Votação resetada com sucesso.");
}

let activeKillTab = "daily";

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildKillTable(data) {
    if (!data.length) {
        return "<p style='color:#888;text-align:center;padding:20px'>Nenhum kill registrado ainda.</p>";
    }
    const rows = data.map((p, i) => {
        const kd = p.deaths === 0 ? p.kills.toFixed(2) : (p.kills / p.deaths).toFixed(2);
        const kdClass = parseFloat(kd) >= 1 ? "kd-positive" : "kd-negative";
        return `<tr>
            <td>${i + 1}</td>
            <td><span class="clickable-player" onclick="openProfile('${escHtml(p.player)}')">${escHtml(p.player)}</span></td>
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
    document.getElementById("historyPanel").classList.remove("open");
    document.getElementById("historyBtn").style.display = "flex";
    
    document.getElementById("killRankingPanel").classList.add("open");
    document.getElementById("killRankingBtn").style.display = "none";
    fetchKills(activeKillTab);
};

document.getElementById("killPanelClose").onclick = () => {
    document.getElementById("killRankingPanel").classList.remove("open");
    document.getElementById("killRankingBtn").style.display = "flex";
};

// --- Histórico Panel ---
function formatDateToBR(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split(" ");
    if (parts.length !== 2) return dateStr;
    const dateParts = parts[0].split("-");
    if (dateParts.length !== 3) return dateStr;
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
}

document.getElementById("historyBtn").onclick = async () => {
    document.getElementById("killRankingPanel").classList.remove("open");
    document.getElementById("killRankingBtn").style.display = "flex";

    document.getElementById("historyPanel").classList.add("open");
    document.getElementById("historyBtn").style.display = "none";
    const el = document.getElementById("historyPanelBody");
    try {
        const res = await fetch(`${API_URL}/history`);
        const data = await res.json();
        if (!data.length) {
            el.innerHTML = "<p style='color:#888;text-align:center;'>Nenhum histórico ainda.</p>";
            return;
        }
        el.innerHTML = data.reverse().map(h => `
            <div class="history-item">
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
        `).join("");
    } catch (e) {
        el.innerHTML = "<p style='color:#ff3333;'>Erro ao carregar histórico.</p>";
    }
};

document.getElementById("historyPanelClose").onclick = () => {
    document.getElementById("historyPanel").classList.remove("open");
    document.getElementById("historyBtn").style.display = "flex";
};

// --- Profile Modal ---
async function openProfile(playerName) {
    const modal = document.getElementById("profileModal");
    modal.style.display = "flex";
    document.getElementById("profileName").innerText = playerName;
    
    try {
        const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(playerName)}`);
        const data = await res.json();
        
        document.getElementById("profileKills").innerText = data.kills;
        document.getElementById("profileDeaths").innerText = data.deaths;
        
        const topWeapon = data.topWeapon || "N/A";
        document.getElementById("profileWeapon").innerText = topWeapon;
        
        const slug = weaponImages[topWeapon];
        const imgEl = document.getElementById("profileWeaponImg");
        if (slug) {
            imgEl.src = `weapons/${slug}.webp`;
            imgEl.style.display = "block";
        } else {
            imgEl.style.display = "none";
        }
        document.getElementById("profileVictim").innerText = data.favoriteVictim;
        document.getElementById("profileVictimKills").innerText = `${data.favoriteVictimKills} kills`;
        document.getElementById("profileNemesis").innerText = data.nemesis;
        document.getElementById("profileNemesisKills").innerText = `${data.nemesisKills} mortes`;
    } catch(e) {
        console.error(e);
        document.getElementById("profileName").innerText = "Erro ao carregar";
    }
}

document.getElementById("profileClose").onclick = () => {
    document.getElementById("profileModal").style.display = "none";
};

// --- Admin Panel ---
document.getElementById("adminBtn").onclick = () => {
    document.getElementById("adminModal").style.display = "flex";
};

document.getElementById("adminClose").onclick = () => {
    document.getElementById("adminModal").style.display = "none";
};

document.getElementById("adminPassword").oninput = (e) => {
    if (e.target.value.length > 0) {
        document.getElementById("adminActions").style.opacity = "1";
        document.getElementById("adminActions").style.pointerEvents = "auto";
    } else {
        document.getElementById("adminActions").style.opacity = "0.5";
        document.getElementById("adminActions").style.pointerEvents = "none";
    }
};

async function execAdminCmd(cmdType, payload) {
    const pass = document.getElementById("adminPassword").value;
    const body = { password: pass, cmd_type: cmdType, ...payload };
    
    try {
        const res = await fetch(`${API_URL}/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) alert("Erro: " + await res.text());
        else {
            alert("Comando executado!");
            if (cmdType === "map") document.getElementById("adminMapInput").value = "";
            if (cmdType === "kick") document.getElementById("adminKickInput").value = "";
            if (cmdType === "say") document.getElementById("adminSayInput").value = "";
        }
    } catch(e) {
        alert("Erro na requisição: " + e.message);
    }
}

document.getElementById("adminMapBtn").onclick = () => {
    execAdminCmd("map", { map: document.getElementById("adminMapInput").value });
};
document.getElementById("adminKickBtn").onclick = () => {
    execAdminCmd("kick", { player: document.getElementById("adminKickInput").value });
};
document.getElementById("adminSayBtn").onclick = () => {
    execAdminCmd("say", { msg: document.getElementById("adminSayInput").value });
};

document.querySelectorAll(".kill-tab").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".kill-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeKillTab = btn.dataset.tab;
        fetchKills(activeKillTab);
    };
});

document.getElementById("resetVotesBtn").onclick = resetVotesManual;

document.querySelectorAll(".close").forEach(c => {
    c.onclick = function() {
        this.parentElement.parentElement.style.display = "none";
    }
});

document.getElementById("confirmVote").onclick = confirmVote;
document.getElementById("downloadMapcycle").onclick = downloadMapcycle;
document.getElementById("startServerBtn").onclick = startServer;
document.getElementById("stopServerBtn").onclick = stopServer;

resetDailyVotes();
renderMaps();
setupWeaponButtons();
setupFriendlyFireButtons();
fetchVotes();

setInterval(updateServerStatus, 15000); // Polling cada 15s pro live server
updateServerStatus();

setInterval(() => {
    if (document.getElementById("killRankingPanel").classList.contains("open")) {
        fetchKills(activeKillTab);
    }
}, 15000);