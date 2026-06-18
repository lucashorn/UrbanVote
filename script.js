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
let matchHistory = [];
let defaultTimelimit = 5;
let defaultFraglimit = 10;

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
    "Beretta": "beretta", "Beretta 92FS": "beretta", "BERETTA": "beretta",
    "Desert Eagle": "deagle", ".50 Desert Eagle": "deagle", "DEAGLE": "deagle",
    "SPAS": "spas12", "SPAS 12": "spas12", "Franchi SPAS-12": "spas12", "SPAS-12": "spas12", "SPAS": "spas12",
    "MP5K": "mp5k", "H&K MP5K": "mp5k", "MP5K": "mp5k",
    "UMP45": "ump45", "H&K UMP 45": "ump45", "UMP 45": "ump45", "UMP45": "ump45",
    "HK69": "hk69", "H&K 69": "hk69", "H&K69": "hk69",
    "LR300": "lr300", "LR300ML": "lr300", "ZM LR 300": "lr300", "ZM LR300": "lr300",
    "G36": "g36", "H&K G-36": "g36", "H&K G36": "g36", "G36": "g36",
    "PSG-1": "psg1", "PSG1": "psg1", "6. PSG-1": "psg1", "PSG1": "psg1",
    "HE Grenade": "hegrenade", "HEGRENADE": "hegrenade",
    "Knife": "knife",
    "Smoke Grenade": "smokegrenade",
    "Kevlar Vest": "vest",
    "Goggles": "goggles",
    "Medkit": "medkit",
    "Silencer": "silencer",
    "Laser": "laser", "Laser Sight": "laser",
    "Helmet": "helmet",
    "Extra Ammo": "extraammo",
    "SR8": "sr8", "SR-8": "sr8",
    "AK-103": "ak103", "AK 103": "ak103", "AK103": "ak103",
    "Negev": "negev", "Negev LMG": "negev", "IMI NEGEV": "negev",
    "M4A1": "m4a1", "Colt M4A1": "m4a1", "M4": "m4a1", "m4": "m4a1", "M4A1": "m4a1",
    "Glock": "glock", "GLOCK": "glock",
    "Colt 1911": "colt1911", "COLT1911": "colt1911",
    "MAC11": "mac11", "MAC 11": "mac11",
    "FRF1": "frf1", "FR-F1": "frf1",
    "Benelli": "benelli", "Benelli M4": "benelli", "BENELLI": "benelli",
    "P90": "p90", "FN P90": "p90", "P90": "p90",
    "Magnum": "magnum", "MAGNUM": "magnum",
    "KNIFE": "knife", "KNIFE_THROWN": "knife", "BLED": "medkit"
};

const customWeaponMapping = {};
Object.values(customWeaponGroups).forEach(group => Object.assign(customWeaponMapping, group));

const OFFICIAL_GEAR_ORDER = "FGHIJKLMNZacefghijklOQRSTUVWX";

let selectedCustomWeapons = [];

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
                img.src = `weapons/${slug}.webp?v=${Date.now()}`;
                img.style.width = "40px";
                img.style.height = "auto";
                img.style.margin = "0 8px";
                img.style.cursor = "zoom-in";
                img.title = "Clique para ampliar";
                img.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openWeaponZoom(slug, name);
                };
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

function selectAllWeapons() {
    selectedCustomWeapons = Object.keys(customWeaponMapping);
    document.querySelectorAll('#customWeaponsList input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function unselectAllWeapons() {
    selectedCustomWeapons = [];
    document.querySelectorAll('#customWeaponsList input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function openWeaponZoom(slug, name) {
    const modal = document.getElementById("weaponZoomModal");
    const img = document.getElementById("zoomedWeaponImg");
    const nameEl = document.getElementById("zoomedWeaponName");

    img.src = `weapons/${slug}.webp?v=${Date.now()}`;
    nameEl.innerText = name;
    modal.style.display = "flex";
}

function closeWeaponZoom() {
    document.getElementById("weaponZoomModal").style.display = "none";
}

function openAvatarZoom(imgSrc) {
    if (!imgSrc) return;
    const modal = document.getElementById("avatarZoomModal");
    const img = document.getElementById("zoomedAvatarImg");
    img.src = imgSrc;
    modal.style.display = "flex";
}

function closeAvatarZoom() {
    document.getElementById("avatarZoomModal").style.display = "none";
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
            applyModalRestrictions();
        };

        container.appendChild(btn);
    });
}

function applyModalRestrictions() {
    const isGunGame = (selectedMode === "11");
    const isLmsOrFfa = (selectedMode === "1" || selectedMode === "2");

    const weaponLabel = document.getElementById("labelWeapon");
    const weaponGrid = document.getElementById("weaponGrid");
    const ffLabel = document.getElementById("labelFF");
    const ffGrid = document.getElementById("ffGrid");
    const fraglimitInput = document.getElementById("voteFraglimit");

    if (!weaponLabel || !weaponGrid || !ffLabel || !ffGrid || !fraglimitInput) return;

    // Reset default styling
    weaponLabel.style.opacity = "1";
    weaponGrid.style.pointerEvents = "auto";
    weaponGrid.style.opacity = "1";

    ffLabel.style.opacity = "1";
    ffGrid.style.pointerEvents = "auto";
    ffGrid.style.opacity = "1";

    fraglimitInput.disabled = false;
    fraglimitInput.style.opacity = "1";
    fraglimitInput.parentElement.style.opacity = "1";

    // Gun Game restrictions:
    // - Lock weapon type to "Todas as armas" (All weapons)
    // - Do not allow friendly fire selection (leave it at default, "0")
    // - Do not allow kill limit (fraglimit) selection
    if (isGunGame) {
        // Lock weapon to "Todas as armas"
        selectedWeapon = "Todas as armas";
        document.querySelectorAll(".weapon-btn").forEach(b => {
            if (b.dataset.weapon === "Todas as armas") {
                b.classList.add("active");
            } else {
                b.classList.remove("active");
            }
        });
        weaponLabel.style.opacity = "0.4";
        weaponGrid.style.pointerEvents = "none";
        weaponGrid.style.opacity = "0.4";

        // Lock friendly fire to "0"
        selectedFriendlyFire = "0";
        document.querySelectorAll(".ff-btn").forEach(b => {
            if (b.dataset.ff === "0") {
                b.classList.add("active");
            } else {
                b.classList.remove("active");
            }
        });
        ffLabel.style.opacity = "0.4";
        ffGrid.style.pointerEvents = "none";
        ffGrid.style.opacity = "0.4";

        // Disable fraglimit input
        fraglimitInput.value = "";
        fraglimitInput.disabled = true;
        fraglimitInput.style.opacity = "0.4";
        fraglimitInput.parentElement.style.opacity = "0.4";
    }
    // LMS/FFA restrictions:
    // - Do not allow friendly fire selection (leave it at default, "0")
    else if (isLmsOrFfa) {
        // Lock friendly fire to "0"
        selectedFriendlyFire = "0";
        document.querySelectorAll(".ff-btn").forEach(b => {
            if (b.dataset.ff === "0") {
                b.classList.add("active");
            } else {
                b.classList.remove("active");
            }
        });
        ffLabel.style.opacity = "0.4";
        ffGrid.style.pointerEvents = "none";
        ffGrid.style.opacity = "0.4";
    }
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

    document.getElementById("voteTimelimit").value = "";
    document.getElementById("voteFraglimit").value = "";

    applyModalRestrictions();

    document.getElementById("voteModal").style.display = "flex";
}

async function confirmVote() {
    const timeValRaw = document.getElementById("voteTimelimit").value.trim();
    const fragValRaw = document.getElementById("voteFraglimit").value.trim();

    const timelimit = (timeValRaw !== "") ? parseInt(timeValRaw, 10) : defaultTimelimit;
    const fraglimit = (fragValRaw !== "") ? parseInt(fragValRaw, 10) : defaultFraglimit;

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
            friendlyFire: selectedFriendlyFire,
            timelimit: isNaN(timelimit) ? defaultTimelimit : timelimit,
            fraglimit: isNaN(fraglimit) ? defaultFraglimit : fraglimit
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
    const timeByMap = {};
    const fragByMap = {};

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
        const mostVotedMode = Object.entries(modeByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const mostVotedWeapon = Object.entries(weaponByMap[map]).sort((a, b) => b[1] - a[1])[0][0];
        const mostVotedFF = Object.entries(ffByMap[map]).sort((a, b) => b[1] - a[1])[0][0];

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

        if (data.running) {
            dot.className = "status-dot online";
            text.innerText = "Servidor Online";
            startBtn.style.display = "none";
            stopBtn.style.display = "inline-block";

            // Render Floating Panel
            const floatPanel = document.getElementById("livePlayersFloatingPanel");
            const floatMap = document.getElementById("floatingMapName");
            const floatCount = document.getElementById("floatingPlayerCount");
            const floatList = document.getElementById("floatingPlayerList");

            if (data.players.length === 0) {
                floatPanel.style.display = "none";
            } else {
                floatMap.innerHTML = `<i class="fas fa-map"></i> ${escHtml(data.map || "Desconhecido")}`;
                floatCount.innerText = `${data.players.length}/12`;

                floatList.innerHTML = data.players.map(p => {
                    const pingVal = parseInt(p.ping) || 0;
                    let pingClass = "ping-low";
                    if (pingVal >= 120) pingClass = "ping-high";
                    else if (pingVal >= 50) pingClass = "ping-mid";

                    const avatarHtml = p.avatar
                        ? `<img src="${p.avatar}" onclick="openAvatarZoom('${p.avatar_original || p.avatar}')" class="floating-player-avatar zoomable-avatar" title="Clique para ampliar">`
                        : `<i class="fas fa-user-circle floating-player-icon"></i>`;

                    return `
                        <div class="floating-player-row">
                            <div class="floating-player-left">
                                ${avatarHtml}
                                <span class="floating-player-name" onclick="openProfile('${escHtml(p.name)}')">${escHtml(p.name)}</span>
                            </div>
                            <div class="floating-player-right">
                                <span class="floating-player-score">${escHtml(p.score)} pts</span>
                                <span class="floating-player-ping ${pingClass}">${escHtml(p.ping)}ms</span>
                            </div>
                        </div>
                    `;
                }).join("");

                floatPanel.style.display = "flex";
            }
        } else {
            dot.className = "status-dot offline";
            text.innerText = "Servidor Offline";
            startBtn.style.display = "inline-block";
            stopBtn.style.display = "none";
            document.getElementById("livePlayersFloatingPanel").style.display = "none";
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

// --- Scoreboard Modal ---
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

// --- All Matches Modal ---
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

const ACHIEVEMENTS_METADATA = {
    "kills": {
        name: "Exterminador",
        description: "Eliminações no total. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-crosshairs"
    },
    "deaths": {
        name: "Saco de Pancadas",
        description: "Mortes no total. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-skull"
    },
    "matches": {
        name: "Veterano",
        description: "Partidas completadas. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-gamepad"
    },
    "mvp": {
        name: "Destaque",
        description: "Vezes sendo o MVP da partida. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-award"
    },
    "triple_kills": {
        name: "Multi-kill",
        description: "Vezes que matou 3 inimigos sem morrer (Triple Kill). Cada nível dobra o objetivo anterior.",
        icon: "fas fa-fire-flame-curved"
    },
    "max_streak": {
        name: "Imbatível",
        description: "Sequência de eliminações sem morrer. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-bolt"
    },
    "headshots": {
        name: "Atirador de Elite",
        description: "Eliminações com tiros na cabeça (Headshot). Cada nível dobra o objetivo anterior.",
        icon: "fas fa-bullseye"
    },
    "hs_ratio": {
        name: "Mira Perfeita",
        description: "Porcentagem de tiros na cabeça (mínimo 50 acertos). Cada nível exige +10% de precisão.",
        icon: "fas fa-crosshairs"
    },
    "weapon_sniper": {
        name: "Olho de Águia",
        description: "Eliminações com Rifles Sniper (PSG1, SR8, FRF1). Cada nível dobra o objetivo anterior.",
        icon: "fas fa-crosshairs"
    },
    "weapon_pistol": {
        name: "Pistoleiro",
        description: "Eliminações com Pistolas. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-gun"
    },
    "weapon_auto": {
        name: "Rambo",
        description: "Eliminações com Armas Automáticas. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-shield-halved"
    },
    "weapon_shotgun": {
        name: "Impacto Próximo",
        description: "Eliminações com Escopetas (SPAS, Benelli). Cada nível dobra o objetivo anterior.",
        icon: "fas fa-bullseye"
    },
    "weapon_grenade": {
        name: "Mestre da Explosão",
        description: "Eliminações com Granadas (HE, HK69). Cada nível dobra o objetivo anterior.",
        icon: "fas fa-bomb"
    },
    "weapon_knife": {
        name: "Assassino Furtivo",
        description: "Eliminações com a Faca (Knife). Cada nível dobra o objetivo anterior.",
        icon: "fas fa-skull"
    },
    "knife_thrown": {
        name: "Cirúrgico",
        description: "Eliminações arremessando a faca. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-bolt"
    },
    "kd_elite": {
        name: "Soldado de Elite",
        description: "Mantenha um K/D alto (mínimo 100 kills). Cada nível dobra o K/D exigido.",
        icon: "fas fa-shield-halved"
    },
    "unbeatable": {
        name: "Massacre",
        description: "Eliminações em uma única partida. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-fire-flame-curved"
    },
    "nemesis_hunter": {
        name: "Caçador de Nêmesis",
        description: "Elimine o mesmo jogador 100 vezes. Cada nível dobra o objetivo anterior.",
        icon: "fas fa-user-ninja"
    },
    "victim_collector": {
        name: "Colecionador de Almas",
        description: "Elimine diferentes jogadores. Cada nível dobra a quantidade exigida.",
        icon: "fas fa-people-group"
    },
    "completionist": {
        name: "Perfeccionista",
        description: "Desbloqueie e atinja o mesmo nível em TODAS as outras 19 conquistas.",
        icon: "fas fa-crown"
    }
};


// --- Profile Modal & Comparison ---
let activeProfileData = null;

function resetComparisonMode() {
    const selectorContainer = document.getElementById("compareSelectorContainer");
    const compareBtn = document.getElementById("profileCompareBtn");
    const closeBtn = document.getElementById("closeCompareBtn");
    const compLayout = document.getElementById("profileComparisonLayout");
    const normalLayout = document.querySelector(".profile-body-layout");
    
    if (selectorContainer) selectorContainer.style.display = "none";
    if (compareBtn) {
        compareBtn.style.display = "flex";
        compareBtn.disabled = false;
    }
    if (closeBtn) closeBtn.style.display = "none";
    if (compLayout) {
        compLayout.style.display = "none";
        compLayout.innerHTML = "";
    }
    if (normalLayout) normalLayout.style.display = "flex";
    
    const selectEl = document.getElementById("comparePlayerSelect");
    if (selectEl) selectEl.value = "";
}

function colorMiniHeatmap(container, hitLocations) {
    if (!container) return;
    if (!hitLocations) {
        container.querySelectorAll(`[data-zone]`).forEach(el => {
            el.querySelectorAll("path").forEach(p => p.setAttribute("fill", "transparent"));
            el.style.opacity = "0";
        });
        return;
    }
    const baseColor = "#ff3b30";
    const maxPct = Math.max(...Object.keys(ZONE_META).map(z => (hitLocations[z] || { pct: 0 }).pct || 0));
    
    Object.entries(ZONE_META).forEach(([zone, meta]) => {
        const info = hitLocations[zone] || { count: 0, pct: 0 };
        const pct = info.pct || 0;
        const t = maxPct > 0 ? pct / maxPct : 0;
        const opacity = pct > 0 ? (0.2 + 0.65 * t) : 0;
        
        const zoneEls = container.querySelectorAll(`[data-zone="${zone}"]`);
        zoneEls.forEach(zoneEl => {
            zoneEl.querySelectorAll("path").forEach(p => {
                p.setAttribute("fill", baseColor);
                p.setAttribute("pointer-events", "all");
            });
            zoneEl.style.opacity = opacity.toString();
        });
    });
}

function getStatRowHtml(label, valA, valB, higherIsBetter = true) {
    let winnerClassA = "";
    let winnerClassB = "";
    
    const numA = parseFloat(valA) || 0;
    const numB = parseFloat(valB) || 0;
    
    if (numA !== numB) {
        if (higherIsBetter) {
            if (numA > numB) winnerClassA = "winner";
            else winnerClassB = "winner";
        } else {
            if (numA < numB) winnerClassA = "winner";
            else winnerClassB = "winner";
        }
    }
    
    return `
    <div class="comp-stat-row">
        <span class="comp-stat-val val-a ${winnerClassA}">${valA}</span>
        <span class="comp-stat-label">${label}</span>
        <span class="comp-stat-val val-b ${winnerClassB}">${valB}</span>
    </div>
    `;
}

function getRarityClass(ach) {
    if (!ach.unlocked) return "locked";
    const pct = ach.percent;
    if (pct < 5) return "legendary";
    if (pct < 20) return "epic";
    if (pct < 50) return "rare";
    return "common";
}

function renderComparison(playerA, playerB) {
    const avatarHtmlA = playerA.avatar 
        ? `<img src="${playerA.avatar}" class="comp-avatar">` 
        : `<div class="comp-avatar" style="display:flex;align-items:center;justify-content:center;color:#ff3333;"><i class="fas fa-user-circle" style="font-size:2.8em;"></i></div>`;
        
    const avatarHtmlB = playerB.avatar 
        ? `<img src="${playerB.avatar}" class="comp-avatar">` 
        : `<div class="comp-avatar" style="display:flex;align-items:center;justify-content:center;color:#00ffff;"><i class="fas fa-user-circle" style="font-size:2.8em;"></i></div>`;
        
    const bannerHtml = `
    <div class="comparison-versus-banner">
        <div class="comp-player-card player-a">
            ${avatarHtmlA}
            <h3 class="comp-player-name">${playerA.player}</h3>
        </div>
        <div class="comp-vs-badge">VS</div>
        <div class="comp-player-card player-b">
            ${avatarHtmlB}
            <h3 class="comp-player-name">${playerB.player}</h3>
        </div>
    </div>
    `;
    
    const bestWeaponA = playerA.topWeapon || "N/A";
    const bestWeaponB = playerB.topWeapon || "N/A";
    const bestMapA = playerA.bestMap || "Nenhum";
    const bestMapB = playerB.bestMap || "Nenhum";

    const bestWeaponRow = `
    <div class="comp-stat-row">
        <span class="comp-stat-val val-a">${bestWeaponA}</span>
        <span class="comp-stat-label">Melhor Arma</span>
        <span class="comp-stat-val val-b">${bestWeaponB}</span>
    </div>
    `;
    const bestMapRow = `
    <div class="comp-stat-row">
        <span class="comp-stat-val val-a">${bestMapA}</span>
        <span class="comp-stat-label">Melhor Mapa</span>
        <span class="comp-stat-val val-b">${bestMapB}</span>
    </div>
    `;

    const statsHtml = `
    <div class="comparison-section">
        <h4 class="comparison-section-title"><i class="fas fa-chart-bar"></i> Duelo de Estatísticas</h4>
        <div class="comparison-stats-box">
            ${getStatRowHtml("Kills", playerA.kills, playerB.kills, true)}
            ${getStatRowHtml("Mortes", playerA.deaths, playerB.deaths, false)}
            ${getStatRowHtml("K/D Ratio", playerA.kd !== undefined ? playerA.kd : "0.00", playerB.kd !== undefined ? playerB.kd : "0.00", true)}
            ${getStatRowHtml("Kills/min", playerA.killsPerMin !== undefined ? playerA.killsPerMin : "0.00", playerB.killsPerMin !== undefined ? playerB.killsPerMin : "0.00", true)}
            ${getStatRowHtml("Maior Seq.", playerA.maxStreak || 0, playerB.maxStreak || 0, true)}
            ${getStatRowHtml("Headshot %", playerA.hsPercent !== undefined ? playerA.hsPercent : 0.0, playerB.hsPercent !== undefined ? playerB.hsPercent : 0.0, true)}
            ${bestWeaponRow}
            ${bestMapRow}
        </div>
    </div>
    `;
    
    const baseSvg = document.querySelector(".body-heatmap-inner").innerHTML;
    
    // Helper to make SVG clip paths and IDs unique per player container to resolve clip-path duplication conflicts
    const makeSvgUnique = (svgText, suffix) => {
        return svgText
            .replace(/id=(?:["'])?clip/gi, `id="clip_${suffix}_`)
            .replace(/id=(?:["'])?heatmap-/gi, `id="heatmap-${suffix}-`)
            .replace(/url\((?:&quot;|\\?["'])?#clip/gi, match => match.replace('#clip', `#clip_${suffix}_`));
    };
    
    const svgHtmlA = makeSvgUnique(baseSvg, "comp_a");
    const svgHtmlB = makeSvgUnique(baseSvg, "comp_b");
    
    const precisionRowsHtml = Object.entries(ZONE_META).map(([zone, meta]) => {
        const pctA = playerA.hitLocations && playerA.hitLocations[zone] ? playerA.hitLocations[zone].pct : 0.0;
        const pctB = playerB.hitLocations && playerB.hitLocations[zone] ? playerB.hitLocations[zone].pct : 0.0;
        
        let winnerClassA = "";
        let winnerClassB = "";
        if (pctA !== pctB) {
            if (pctA > pctB) winnerClassA = "winner";
            else winnerClassB = "winner";
        }
        
        return `
        <div class="comp-precision-row">
            <span class="comp-precision-val val-a ${winnerClassA}">${pctA.toFixed(1)}%</span>
            <span class="comp-precision-label">${meta.label}</span>
            <span class="comp-precision-val val-b ${winnerClassB}">${pctB.toFixed(1)}%</span>
        </div>
        `;
    }).join("");
    
    const heatmapsHtml = `
    <div class="comparison-section">
        <h4 class="comparison-section-title"><i class="fas fa-crosshairs"></i> Duelo de Precisão</h4>
        <div class="comparison-heatmaps-container">
            <div class="comp-heatmap-wrapper player-a">
                <span class="comp-heatmap-title">${playerA.player}</span>
                <div id="compHeatmapA" class="comp-heatmap-svg-container">
                    ${svgHtmlA}
                </div>
            </div>
            <div class="comp-heatmap-wrapper player-b">
                <span class="comp-heatmap-title">${playerB.player}</span>
                <div id="compHeatmapB" class="comp-heatmap-svg-container">
                    ${svgHtmlB}
                </div>
            </div>
        </div>
        <div class="comp-precision-table">
            <div class="comp-precision-row header">
                <span class="comp-precision-val val-a">${playerA.player}</span>
                <span class="comp-precision-label">Zona de Impacto</span>
                <span class="comp-precision-val val-b">${playerB.player}</span>
            </div>
            ${precisionRowsHtml}
        </div>
    </div>
    `;
    
    let achievementsRowsHtml = "";
    Object.keys(ACHIEVEMENTS_METADATA).forEach(id => {
        const meta = ACHIEVEMENTS_METADATA[id];
        const achA = playerA.achievements[id] || { unlocked: false, level: 0, roman: "", current: 0, target: 100, percent: 0.0 };
        const achB = playerB.achievements[id] || { unlocked: false, level: 0, roman: "", current: 0, target: 100, percent: 0.0 };
        
        const rarityClassA = getRarityClass(achA);
        const rarityClassB = getRarityClass(achB);
        
        const lvlTextA = achA.unlocked ? achA.roman : "-";
        const lvlTextB = achB.unlocked ? achB.roman : "-";
        
        const progressPctA = achA.target > 0 ? Math.min(100, Math.round((achA.current / achA.target) * 100)) : 0;
        const progressPctB = achB.target > 0 ? Math.min(100, Math.round((achB.current / achB.target) * 100)) : 0;
        
        let diffHtmlA = "";
        let diffHtmlB = "";
        
        if (achA.level > achB.level) {
            diffHtmlA = `<span class="comp-ach-diff ahead-a">+${achA.level - achB.level} Nív</span>`;
        } else if (achB.level > achA.level) {
            diffHtmlB = `<span class="comp-ach-diff ahead-b">+${achB.level - achA.level} Nív</span>`;
        } else {
            if (achA.unlocked && !achB.unlocked) {
                diffHtmlA = `<span class="comp-ach-diff ahead-a">Liberado</span>`;
            } else if (!achA.unlocked && achB.unlocked) {
                diffHtmlB = `<span class="comp-ach-diff ahead-b">Liberado</span>`;
            }
        }
        
        achievementsRowsHtml += `
        <div class="comp-ach-row">
            <div class="comp-ach-player-side side-a">
                <div class="comp-ach-status">
                    ${diffHtmlA}
                    <span class="comp-ach-badge ${rarityClassA}">${lvlTextA}</span>
                    <span class="comp-ach-val-text">${achA.current}/${achA.target}</span>
                </div>
                <div class="comp-ach-bar-bg">
                    <div class="comp-ach-bar-fill" style="width: ${progressPctA}%;"></div>
                </div>
            </div>
            
            <div class="comp-ach-center">
                <div class="comp-ach-header">
                    <i class="${meta.icon}"></i>
                    <span class="comp-ach-name">${meta.name}</span>
                </div>
                <span class="comp-ach-desc">${meta.description}</span>
            </div>
            
            <div class="comp-ach-player-side side-b">
                <div class="comp-ach-status">
                    ${diffHtmlB}
                    <span class="comp-ach-badge ${rarityClassB}">${lvlTextB}</span>
                    <span class="comp-ach-val-text">${achB.current}/${achB.target}</span>
                </div>
                <div class="comp-ach-bar-bg">
                    <div class="comp-ach-bar-fill" style="width: ${progressPctB}%;"></div>
                </div>
            </div>
        </div>
        `;
    });
    
    const achievementsSectionHtml = `
    <div class="comparison-section">
        <h4 class="comparison-section-title"><i class="fas fa-medal"></i> Duelo de Conquistas</h4>
        <div class="comp-achievements-list">
            ${achievementsRowsHtml}
        </div>
    </div>
    `;

    const comparisonLayout = document.getElementById("profileComparisonLayout");
    comparisonLayout.innerHTML = `
        ${bannerHtml}
        ${statsHtml}
        ${heatmapsHtml}
        ${achievementsSectionHtml}
    `;
    comparisonLayout.style.display = "flex";
    
    colorMiniHeatmap(document.getElementById("compHeatmapA"), playerA.hitLocations);
    colorMiniHeatmap(document.getElementById("compHeatmapB"), playerB.hitLocations);
}

function initCompareEvents() {
    const compareBtn = document.getElementById("profileCompareBtn");
    const selectEl = document.getElementById("comparePlayerSelect");
    const closeBtn = document.getElementById("closeCompareBtn");
    
    if (compareBtn) {
        compareBtn.onclick = async () => {
            compareBtn.style.display = "none";
            document.getElementById("compareSelectorContainer").style.display = "flex";
            if (closeBtn) closeBtn.style.display = "inline-block";
            
            if (selectEl) {
                selectEl.innerHTML = '<option value="">Selecionar Jogador...</option>';
                try {
                    const res = await fetch(`${API_URL}/kills?period=all`);
                    const players = await res.json();
                    
                    const currentPlayer = activeProfileData ? activeProfileData.player : "";
                    players.forEach(p => {
                        if (p.player && p.player !== currentPlayer) {
                            const opt = document.createElement("option");
                            opt.value = p.player;
                            opt.innerText = p.player;
                            selectEl.appendChild(opt);
                        }
                    });
                } catch (e) {
                    console.error("Erro ao carregar jogadores", e);
                }
            }
        };
    }
    
    if (selectEl) {
        selectEl.onchange = async () => {
            const opponent = selectEl.value;
            if (!opponent) {
                const compLayout = document.getElementById("profileComparisonLayout");
                const normalLayout = document.querySelector(".profile-body-layout");
                if (compLayout) compLayout.style.display = "none";
                if (normalLayout) normalLayout.style.display = "flex";
                return;
            }
            
            try {
                const normalLayout = document.querySelector(".profile-body-layout");
                if (normalLayout) normalLayout.style.display = "none";
                
                const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(opponent)}`);
                const opponentData = await res.json();
                
                if (activeProfileData) {
                    renderComparison(activeProfileData, opponentData);
                }
            } catch (e) {
                console.error("Erro ao buscar oponente", e);
            }
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            resetComparisonMode();
        };
    }
}

// --- Profile Modal ---
async function openProfile(playerName) {
    const modal = document.getElementById("profileModal");
    modal.style.display = "flex";
    document.getElementById("profileName").innerText = playerName;

    // Reset comparison mode and disable button while loading
    resetComparisonMode();
    const compareBtn = document.getElementById("profileCompareBtn");
    if (compareBtn) compareBtn.disabled = true;

    // Reset avatar display
    document.getElementById("profileAvatarIcon").style.display = "block";
    document.getElementById("profileAvatarImg").style.display = "none";

    // Clear old achievements
    const achContainer = document.getElementById("profileAchievements");
    if (achContainer) {
        achContainer.innerHTML = "";
    }

    try {
        const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(playerName)}`);
        const data = await res.json();
        activeProfileData = data;

        if (data.avatar) {
            document.getElementById("profileAvatarIcon").style.display = "none";
            document.getElementById("profileAvatarImg").src = data.avatar;
            document.getElementById("profileAvatarImg").dataset.original = data.avatar_original || data.avatar;
            document.getElementById("profileAvatarImg").style.display = "block";
        }

        document.getElementById("profileKills").innerText = data.kills;
        document.getElementById("profileDeaths").innerText = data.deaths;
        document.getElementById("profileKD").innerText = data.kd !== undefined ? data.kd : "-";
        document.getElementById("profileKillsMin").innerText = data.killsPerMin !== undefined ? data.killsPerMin : "-";
        document.getElementById("profileBestMap").innerText = data.bestMap || "Nenhum";
        document.getElementById("profileMaxStreak").innerText = `${data.maxStreak || 0} kills`;
        document.getElementById("profileHS").innerText = `${data.hsPercent || 0.0}%`;

        const mapImgEl = document.getElementById("profileBestMapImg");
        if (data.bestMap && data.bestMap !== "Nenhum") {
            mapImgEl.src = getMapImage(data.bestMap);
            mapImgEl.style.display = "block";
            mapImgEl.onerror = () => { mapImgEl.style.display = "none"; };
        } else {
            mapImgEl.style.display = "none";
        }

        const topWeapon = data.topWeapon || "N/A";
        document.getElementById("profileWeapon").innerText = topWeapon;

        let slug = weaponImages[topWeapon];
        if (!slug && topWeapon) {
            const lower = topWeapon.toLowerCase();
            slug = Object.values(weaponImages).find(s => s.toLowerCase() === lower);
        }

        const imgEl = document.getElementById("profileWeaponImg");
        if (slug) {
            imgEl.src = `weapons/${slug}.webp?v=${Date.now()}`;
            imgEl.style.display = "block";
        } else {
            imgEl.style.display = "none";
        }
        document.getElementById("profileVictim").innerText = data.favoriteVictim;
        document.getElementById("profileVictimKills").innerText = `${data.favoriteVictimKills} kills`;
        document.getElementById("profileNemesis").innerText = data.nemesis;
        document.getElementById("profileNemesisKills").innerText = `${data.nemesisKills} mortes`;

        // Render achievements grid
        if (data.achievements && achContainer) {
            Object.keys(ACHIEVEMENTS_METADATA).forEach(id => {
                const meta = ACHIEVEMENTS_METADATA[id];
                const playerAch = data.achievements[id] || { unlocked: false, level: 0, roman: "", current: 0, target: 100, percent: 0.0 };

                const item = document.createElement("div");
                item.className = "achievement-item";

                if (!playerAch.unlocked) {
                    item.classList.add("locked");
                } else {
                    const pct = playerAch.percent;
                    if (pct < 5) {
                        item.classList.add("legendary");
                    } else if (pct < 20) {
                        item.classList.add("epic");
                    } else if (pct < 50) {
                        item.classList.add("rare");
                    } else {
                        item.classList.add("common");
                    }

                    // Render level badge
                    if (playerAch.roman) {
                        const badge = document.createElement("span");
                        badge.className = "achievement-level";
                        badge.innerText = playerAch.roman;
                        item.appendChild(badge);
                    }
                }

                const lvlText = playerAch.unlocked ? `Nível ${playerAch.roman} (${playerAch.level})` : "Bloqueado";
                const rarityText = playerAch.percent < 5 ? "Lendária" : playerAch.percent < 20 ? "Épica" : playerAch.percent < 50 ? "Rara" : "Comum";
                const progressText = `Progresso: ${playerAch.current} / ${playerAch.target}`;
                const rarityPctText = `Raridade: ${playerAch.percent}% dos jogadores (${rarityText})`;

                const tooltipText = `${meta.name} - ${lvlText}\n${meta.description}\n\n${progressText}\n${rarityPctText}`;
                item.setAttribute("data-tooltip", tooltipText);

                const icon = document.createElement("i");
                icon.className = meta.icon;
                item.appendChild(icon);

                achContainer.appendChild(item);
            });
        }
        // Fetch and process anatomical body heatmap SVG (random between musculo.svg and tpose.svg)
        try {
            const anatomicalSvgs = {
                "musculo.svg": {
                    clipZones: {
                        "clip0_64_73": "legs",
                        "clip1_64_73": "torso",
                        "clip2_64_73": "torso",
                        "clip3_64_73": "torso",
                        "clip4_64_73": "arms",
                        "clip5_64_73": "arms",
                        "clip6_64_73": "arms",
                        "clip7_64_73": "head"
                    }
                },
                "tpose.svg": {
                    clipZones: {
                        "clip0_66_99": "legs",
                        "clip1_66_99": "torso",
                        "clip3_66_99": "arms",
                        "clip2_66_99": "arms",
                        "clip4_66_99": "head"
                    }
                },
                "dance.svg": {
                    clipZones: {
                        "clip9_68_32": "head",
                        "clip4_68_32": "torso",
                        "clip3_68_32": "torso",
                        "clip2_68_32": "legs",
                        "clip5_68_32": "arms",
                        "clip7_68_32": "arms",
                        "clip6_68_32": "arms",
                        "clip8_68_32": "arms",
                        "clip1_68_32": "legs",
                        "clip0_68_32": "legs"
                    }
                },
                "espacate.svg": {
                    clipZones: {
                        "clip0_73_25": "legs",
                        "clip1_73_25": "torso",
                        "clip3_73_25": "arms",
                        "clip2_73_25": "head",
                        "clip4_73_25": "arms"
                    }
                },
                "ashtasharan.svg": {
                    clipZones: {
                        "clip0_73_49": "legs",
                        "clip1_73_49": "torso",
                        "clip2_73_49": "arms",
                        "clip3_73_49": "arms",
                        "clip4_73_49": "head"
                    }
                },
                "hamster.svg": {
                    clipZones: {
                        "clip0_73_131": "legs",
                        "clip1_73_131": "torso",
                        "clip2_73_131": "torso",
                        "clip3_73_131": "torso",
                        "clip4_73_131": "torso",
                        "clip5_73_131": "torso",
                        "clip6_73_131": "head",
                        "clip7_73_131": "arms",
                        "clip8_73_131": "arms",
                        "clip9_73_131": "arms",
                        "clip10_73_131": "arms",
                        "clip11_73_131": "arms",
                        "clip12_73_131": "arms",
                        "clip13_73_131": "arms"
                    }
                }
            };

            const svgFiles = Object.keys(anatomicalSvgs);
            const randomFile = svgFiles[Math.floor(Math.random() * svgFiles.length)];
            const config = anatomicalSvgs[randomFile];

            const svgRes = await fetch(`svg/${randomFile}`);
            const svgText = await svgRes.text();

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
            const svgElement = svgDoc.documentElement;

            // Expand torso clipPath widths in musculo.svg to overlap by 3px and avoid hairline gaps
            if (randomFile === "musculo.svg") {
                const clip1 = svgElement.querySelector("#clip1_64_73 rect");
                const clip2 = svgElement.querySelector("#clip2_64_73 rect");
                if (clip1) {
                    const w = parseFloat(clip1.getAttribute("width") || "196");
                    clip1.setAttribute("width", (w + 3).toString());
                }
                if (clip2) {
                    const w = parseFloat(clip2.getAttribute("width") || "188");
                    clip2.setAttribute("width", (w + 3).toString());
                }
            }

            // Expand clipPath borders in dance.svg to overlap adjacent clips and avoid hairline seam gaps
            if (randomFile === "dance.svg") {
                // TORSO seam: clip4 bottom (y=692) e clip3 bottom (y=692) encontram clip2 top (y=692)
                // Estende o torso para baixo em 1.2px para sobrepor as pernas (legs)
                const clip4d = svgElement.querySelector("#clip4_68_32 rect");
                if (clip4d) {
                    const h = parseFloat(clip4d.getAttribute("height") || "403");
                    clip4d.setAttribute("height", (h + 1.2).toString());
                }
                const clip3d = svgElement.querySelector("#clip3_68_32 rect");
                if (clip3d) {
                    const h = parseFloat(clip3d.getAttribute("height") || "125");
                    clip3d.setAttribute("height", (h + 1.2).toString());
                }
                // LEGS seam: clip2 (y=692-740) encontra clip1 (y=740-804)
                // Estende clip2 para baixo e clip1 para cima em 1.2px
                const clip2d = svgElement.querySelector("#clip2_68_32 rect");
                if (clip2d) {
                    const h = parseFloat(clip2d.getAttribute("height") || "48");
                    clip2d.setAttribute("height", (h + 1.2).toString());
                }
                const clip1d = svgElement.querySelector("#clip1_68_32 rect");
                if (clip1d) {
                    const transform = clip1d.getAttribute("transform");
                    const translateMatch = transform ? transform.match(/translate\(\s*(-?\d+\.?\d*)\s*[, ]\s*(-?\d+\.?\d*)\s*\)/) : null;
                    const h = parseFloat(clip1d.getAttribute("height") || "64");

                    if (translateMatch) {
                        const tx = parseFloat(translateMatch[1]);
                        const ty = parseFloat(translateMatch[2]);
                        clip1d.setAttribute("transform", `translate(${tx} ${ty - 1.2})`);
                    } else {
                        const y = parseFloat(clip1d.getAttribute("y") || "740");
                        clip1d.setAttribute("y", (y - 1.2).toString());
                    }
                    clip1d.setAttribute("height", (h + 2.4).toString()); // estende para cima e para baixo
                }
                // TORSO/ARMS seam: clip5 bottom (y=567) encontra clip3 top (y=567)
                // Estende o braço (clip5) para baixo para sobrepor a cintura (clip3)
                const clip5d = svgElement.querySelector("#clip5_68_32 rect");
                if (clip5d) {
                    const h = parseFloat(clip5d.getAttribute("height") || "278");
                    clip5d.setAttribute("height", (h + 1.2).toString());
                }
            }

            // Expand clipPath borders in espacate.svg to overlap adjacent clips and avoid hairline seam gaps
            if (randomFile === "espacate.svg") {
                // clip1: y=516, h=466 -> increase height to overlap legs (clip0)
                const clip1e = svgElement.querySelector("#clip1_73_25 rect");
                if (clip1e) {
                    const h = parseFloat(clip1e.getAttribute("height") || "466");
                    clip1e.setAttribute("height", (h + 1.5).toString());
                }
                // clip2: y=310, h=206 -> increase height to overlap clip1
                const clip2e = svgElement.querySelector("#clip2_73_25 rect");
                if (clip2e) {
                    const h = parseFloat(clip2e.getAttribute("height") || "206");
                    clip2e.setAttribute("height", (h + 1.5).toString());
                }
                // clip3: y=138, h=172 -> increase height to overlap clip2
                const clip3e = svgElement.querySelector("#clip3_73_25 rect");
                if (clip3e) {
                    const h = parseFloat(clip3e.getAttribute("height") || "172");
                    clip3e.setAttribute("height", (h + 1.5).toString());
                }
                // clip4: x=525, y=0, w=158, h=516 -> increase height to overlap clip1, and width to overlap clip2/clip3
                const clip4e = svgElement.querySelector("#clip4_73_25 rect");
                if (clip4e) {
                    const w = parseFloat(clip4e.getAttribute("width") || "158");
                    const h = parseFloat(clip4e.getAttribute("height") || "516");
                    clip4e.setAttribute("width", (w + 1.5).toString());
                    clip4e.setAttribute("height", (h + 1.5).toString());
                }
            }

            // Expand clipPath borders in ashtasharan.svg to overlap adjacent clips and avoid hairline seam gaps
            if (randomFile === "ashtasharan.svg") {
                // clip1 (torso): increase height by 1.5px
                const clip1e = svgElement.querySelector("#clip1_73_49 rect");
                if (clip1e) {
                    const h = parseFloat(clip1e.getAttribute("height") || "595");
                    clip1e.setAttribute("height", (h + 1.5).toString());
                }
                // clip4 (head): increase height by 1.5px
                const clip4e = svgElement.querySelector("#clip4_73_49 rect");
                if (clip4e) {
                    const h = parseFloat(clip4e.getAttribute("height") || "258");
                    clip4e.setAttribute("height", (h + 1.5).toString());
                }
                // clip2 (left arms): increase width by 1.5px
                const clip2e = svgElement.querySelector("#clip2_73_49 rect");
                if (clip2e) {
                    const w = parseFloat(clip2e.getAttribute("width") || "322");
                    clip2e.setAttribute("width", (w + 1.5).toString());
                }
                // clip3 (right arms): shift x left by 1.5px, increase width by 1.5px
                const clip3e = svgElement.querySelector("#clip3_73_49 rect");
                if (clip3e) {
                    const w = parseFloat(clip3e.getAttribute("width") || "203");
                    const transform = clip3e.getAttribute("transform");
                    const translateMatch = transform ? transform.match(/translate\(\s*(-?\d+\.?\d*)\s*[, ]\s*(-?\d+\.?\d*)\s*\)/) : null;
                    if (translateMatch) {
                        const tx = parseFloat(translateMatch[1]);
                        const ty = parseFloat(translateMatch[2]);
                        clip3e.setAttribute("transform", `translate(${tx - 1.5} ${ty})`);
                    } else {
                        const x = parseFloat(clip3e.getAttribute("x") || "651");
                        clip3e.setAttribute("x", (x - 1.5).toString());
                    }
                    clip3e.setAttribute("width", (w + 1.5).toString());
                }
            }

            // Expand clipPath borders in hamster.svg to overlap adjacent clips and avoid hairline seam gaps
            if (randomFile === "hamster.svg") {
                // 1. Baseline expansion for all clips to prevent any minor gaps
                svgElement.querySelectorAll("clipPath rect").forEach(rect => {
                    const w = parseFloat(rect.getAttribute("width") || "0");
                    const h = parseFloat(rect.getAttribute("height") || "0");
                    if (w > 0 && h > 0) {
                        rect.setAttribute("width", (w + 2.0).toString());
                        rect.setAttribute("height", (h + 2.0).toString());
                    }
                });

                // 2. Generous vertical overlaps for torso slices (which stack vertically and share the same zone)
                // clip5, clip4, clip3, clip2 can safely overlap downwards by 15px
                const torsoClips = ["clip5_73_131", "clip4_73_131", "clip3_73_131", "clip2_73_131"];
                torsoClips.forEach(id => {
                    const rect = svgElement.querySelector(`#${id} rect`);
                    if (rect) {
                        const h = parseFloat(rect.getAttribute("height") || "0");
                        rect.setAttribute("height", (h + 15.0).toString());
                    }
                });

                // 3. Generous horizontal overlaps for arm slices on the left and right (same zone)
                // Left arm parts overlapping rightward: clip10, clip11, clip12
                const leftArmClips = ["clip10_73_131", "clip11_73_131", "clip12_73_131"];
                leftArmClips.forEach(id => {
                    const rect = svgElement.querySelector(`#${id} rect`);
                    if (rect) {
                        const w = parseFloat(rect.getAttribute("width") || "0");
                        rect.setAttribute("width", (w + 15.0).toString());
                    }
                });

                // Right arm parts overlapping rightward into clip7: clip8, clip9
                const rightArmClips = ["clip8_73_131", "clip9_73_131"];
                rightArmClips.forEach(id => {
                    const rect = svgElement.querySelector(`#${id} rect`);
                    if (rect) {
                        const w = parseFloat(rect.getAttribute("width") || "0");
                        rect.setAttribute("width", (w + 15.0).toString());
                    }
                });
            }


            // Identify body groups
            const bodyGroups = Array.from(svgElement.children).filter(child => child.tagName.toLowerCase() === "g" && child.hasAttribute("clip-path"));

            // 1. Create Background Layer (silhouette body)
            const bgGroupWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
            bgGroupWrapper.id = "heatmap-bg-layer";
            bodyGroups.forEach(g => {
                const clone = g.cloneNode(true);
                clone.querySelectorAll("path").forEach(p => p.setAttribute("fill", "#181a1f"));
                bgGroupWrapper.appendChild(clone);
            });

            // 2. Create Heatmap Layer (solid colored paths, transparent by default)
            const heatGroupWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
            heatGroupWrapper.id = "heatmap-glow-layer";

            // Create wrapper groups for each mapped zone to prevent overlapping transparency seams
            const zoneWrappers = {};
            Object.values(config.clipZones).forEach(zoneName => {
                if (zoneName && !zoneWrappers[zoneName]) {
                    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    wrapper.setAttribute("data-zone", zoneName);
                    wrapper.setAttribute("style", "cursor:pointer; transition: opacity 0.25s ease; opacity: 0;");
                    heatGroupWrapper.appendChild(wrapper);
                    zoneWrappers[zoneName] = wrapper;
                }
            });

            bodyGroups.forEach(g => {
                const clone = g.cloneNode(true);
                const clipPathAttr = clone.getAttribute("clip-path");
                const match = clipPathAttr.match(/#([^)]+)/);
                if (match) {
                    const clipId = match[1];
                    const zoneName = config.clipZones[clipId];
                    if (zoneName && zoneWrappers[zoneName]) {
                        clone.querySelectorAll("path").forEach(p => {
                            p.setAttribute("fill", "transparent");
                        });
                        zoneWrappers[zoneName].appendChild(clone);
                        return;
                    }
                }
                heatGroupWrapper.appendChild(clone);
            });

            // 3. Create Outline Layer (two sublayers: clean outer silhouette + subtle inner division outlines)
            const outlineGroupWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
            outlineGroupWrapper.id = "heatmap-outline-layer";
            outlineGroupWrapper.setAttribute("style", "pointer-events: none;");

            // A. Outer silhouette outline (continuous, unclipped)
            if (bodyGroups.length > 0) {
                const outerClone = bodyGroups[0].cloneNode(true);
                outerClone.removeAttribute("clip-path");
                outerClone.querySelectorAll("path").forEach(p => {
                    p.setAttribute("fill", "none");
                    p.setAttribute("stroke", "rgba(255, 255, 255, 0.85)");
                    p.setAttribute("stroke-width", "1.5");
                    p.setAttribute("vector-effect", "non-scaling-stroke");
                    p.setAttribute("stroke-linejoin", "round");
                    p.setAttribute("stroke-linecap", "round");
                });
                outlineGroupWrapper.appendChild(outerClone);
            }

            // B. Internal zone outlines (clipped, subtle division indicator)
            bodyGroups.forEach(g => {
                const clipPathAttr = g.getAttribute("clip-path");
                if (clipPathAttr) {
                    const match = clipPathAttr.match(/#([^)]+)/);
                    if (match) {
                        const clipId = match[1];
                        const zoneName = config.clipZones[clipId];
                        // Skip torso slices to avoid vertical outlines between the splits inside the torso
                        if (zoneName === "torso") {
                            return;
                        }
                    }
                }
                const clone = g.cloneNode(true);
                clone.querySelectorAll("path").forEach(p => {
                    p.setAttribute("fill", "none");
                    p.setAttribute("stroke", "rgba(255, 255, 255, 0.25)");
                    p.setAttribute("stroke-width", "1.2");
                    p.setAttribute("vector-effect", "non-scaling-stroke");
                    p.setAttribute("stroke-linejoin", "round");
                    p.setAttribute("stroke-linecap", "round");
                });
                outlineGroupWrapper.appendChild(clone);
            });

            // Clean up original children and append new layers
            bodyGroups.forEach(g => svgElement.removeChild(g));
            svgElement.appendChild(bgGroupWrapper);
            svgElement.appendChild(heatGroupWrapper);
            svgElement.appendChild(outlineGroupWrapper);

            // Add class for styling
            svgElement.classList.add("body-heatmap-svg");

            const bodyContainer = document.querySelector(".body-heatmap-inner");
            bodyContainer.innerHTML = svgElement.outerHTML;

        } catch (err) {
            console.error("Erro ao carregar SVG anatômico", err);
        }

        // Render body heatmap
        renderBodyHeatmap(data.hitLocations || null, data.totalHits || 0);
        
        const compareBtn = document.getElementById("profileCompareBtn");
        if (compareBtn) compareBtn.disabled = false;

    } catch (e) {
        console.error(e);
        document.getElementById("profileName").innerText = "Erro ao carregar";
    }
}

// ---- Body Heatmap ----
const ZONE_META = {
    head: { label: "Cabeça", color: "#ff2222" },
    torso: { label: "Tronco", color: "#ff7700" },
    arms: { label: "Braços", color: "#ffcc00" },
    legs: { label: "Pernas", color: "#22dd88" }
};

function renderBodyHeatmap(hitLocations, totalHits) {
    const emptyEl = document.getElementById("bodyHeatmapEmpty");
    const legendEl = document.getElementById("bodyHeatmapLegend");
    const tooltip = document.getElementById("bodyHeatmapTooltip");

    legendEl.innerHTML = "";

    if (!hitLocations || totalHits === 0) {
        emptyEl.style.display = "block";
        // Reset all zones to transparent
        document.querySelectorAll(`.body-heatmap-svg [data-zone]`).forEach(el => {
            el.querySelectorAll("path").forEach(p => p.setAttribute("fill", "transparent"));
            el.style.opacity = "0";
        });
        return;
    }
    emptyEl.style.display = "none";

    const baseColor = "#ff3b30"; // Vermelho premium uniforme
    const maxPct = Math.max(...Object.keys(ZONE_META).map(z => (hitLocations[z] || { pct: 0 }).pct || 0));

    Object.entries(ZONE_META).forEach(([zone, meta]) => {
        const info = hitLocations[zone] || { count: 0, pct: 0 };
        const pct = info.pct || 0;
        const count = info.count || 0;

        const t = maxPct > 0 ? pct / maxPct : 0;
        // Zonas com hits: cor sólida + opacidade normal. Zonas com 0%: fill cor sólida + opacidade 0 (invisível, mas ativa pointer-events).
        const opacity = pct > 0 ? (0.2 + 0.65 * t) : 0;
        const color = baseColor;
        const legendColor = pct > 0 ? baseColor : "#2a2a2a";

        // Bar width relative to max zone (so top zone = 100% width)
        const barWidth = maxPct > 0 ? Math.round((pct / maxPct) * 100) : 0;

        // Apply color and opacity — 0% zones use opacity 0 but keep pointer-events active
        const zoneEls = document.querySelectorAll(`[data-zone="${zone}"]`);
        zoneEls.forEach(zoneEl => {
            zoneEl.querySelectorAll("path").forEach(p => {
                p.setAttribute("fill", color);
                p.setAttribute("pointer-events", "all");
            });
            zoneEl.style.opacity = opacity.toString();
            zoneEl.style.cursor = "pointer";

            // Hover ativo para TODAS as zonas, inclusive as com 0%
            zoneEl.onmouseenter = (e) => {
                tooltip.innerHTML = `<strong>${meta.label}</strong>${count} acertos &bull; ${pct}%`;
                tooltip.style.display = "block";

                // Highlight hovered zone, dim others relatively
                document.querySelectorAll(`.body-heatmap-svg [data-zone]`).forEach(el => {
                    const elZone = el.getAttribute("data-zone");
                    const elInfo = hitLocations[elZone] || { pct: 0 };
                    if (elZone === zone) {
                        if (pct === 0) {
                            el.style.opacity = "0.08";
                        } else {
                            el.style.opacity = "0.95";
                        }
                    } else {
                        const otherT = maxPct > 0 ? elInfo.pct / maxPct : 0;
                        const otherOpacity = elInfo.pct > 0 ? (0.2 + 0.65 * otherT) : 0;
                        el.style.opacity = elInfo.pct > 0 ? (otherOpacity * 0.35).toString() : "0";
                    }
                });
            };
            zoneEl.onmousemove = (e) => {
                tooltip.style.left = (e.clientX + 14) + "px";
                tooltip.style.top = (e.clientY - 10) + "px";
            };
            zoneEl.onmouseleave = () => {
                tooltip.style.display = "none";

                // Restore all zones to default state
                document.querySelectorAll(`.body-heatmap-svg [data-zone]`).forEach(el => {
                    const elZone = el.getAttribute("data-zone");
                    const elInfo = hitLocations[elZone] || { pct: 0 };
                    const elT = maxPct > 0 ? elInfo.pct / maxPct : 0;
                    if (elInfo.pct > 0) {
                        el.style.opacity = (0.2 + 0.65 * elT).toString();
                    } else {
                        el.style.opacity = "0";
                    }
                });
            };
        });

        // Legend row
        const row = document.createElement("div");
        row.className = "heatmap-legend-row";
        row.innerHTML = `
            <span class="heatmap-legend-dot" style="background:${legendColor};opacity:${pct > 0 ? opacity : 0.3};box-shadow:0 0 4px ${legendColor};"></span>
            <span class="heatmap-legend-label">${meta.label}</span>
            <div class="heatmap-legend-bar-wrap">
                <div class="heatmap-legend-bar" style="width:0%;background:${legendColor};opacity:${pct > 0 ? opacity : 0.3};" data-target="${barWidth}"></div>
            </div>
            <span class="heatmap-legend-pct">${pct}%</span>
        `;

        // Highlight SVG zone when hovering over the legend row
        row.onmouseenter = (e) => {
            tooltip.innerHTML = `<strong>${meta.label}</strong>${count} acertos &bull; ${pct}%`;
            tooltip.style.display = "block";

            document.querySelectorAll(`.body-heatmap-svg [data-zone]`).forEach(el => {
                const elZone = el.getAttribute("data-zone");
                const elInfo = hitLocations[elZone] || { pct: 0 };
                if (elZone === zone) {
                    if (pct === 0) {
                        el.style.opacity = "0.08";
                    } else {
                        el.style.opacity = "0.95";
                    }
                } else {
                    const otherT = maxPct > 0 ? elInfo.pct / maxPct : 0;
                    const otherOpacity = elInfo.pct > 0 ? (0.2 + 0.65 * otherT) : 0;
                    el.style.opacity = elInfo.pct > 0 ? (otherOpacity * 0.35).toString() : "0";
                }
            });
        };

        row.onmousemove = (e) => {
            tooltip.style.left = (e.clientX + 14) + "px";
            tooltip.style.top = (e.clientY - 10) + "px";
        };

        row.onmouseleave = () => {
            tooltip.style.display = "none";

            document.querySelectorAll(`.body-heatmap-svg [data-zone]`).forEach(el => {
                const elZone = el.getAttribute("data-zone");
                const elInfo = hitLocations[elZone] || { pct: 0 };
                const elT = maxPct > 0 ? elInfo.pct / maxPct : 0;
                if (elInfo.pct > 0) {
                    el.style.opacity = (0.2 + 0.65 * elT).toString();
                } else {
                    el.style.opacity = "0";
                }
            });
        };

        legendEl.appendChild(row);
    });

    // Animate bars with slight delay
    requestAnimationFrame(() => {
        setTimeout(() => {
            legendEl.querySelectorAll(".heatmap-legend-bar").forEach(bar => {
                bar.style.width = bar.dataset.target + "%";
            });
        }, 80);
    });
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
    } catch (e) {
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
    c.onclick = function () {
        this.parentElement.parentElement.style.display = "none";
    }
});

document.getElementById("confirmVote").onclick = confirmVote;
document.getElementById("downloadMapcycle").onclick = downloadMapcycle;
document.getElementById("startServerBtn").onclick = startServer;
document.getElementById("stopServerBtn").onclick = stopServer;

async function loadTop3Ranking() {
    try {
        const res = await fetch(`${API_URL}/kills?period=all`);
        const data = await res.json();
        const top3 = data.slice(0, 3);
        const listDiv = document.getElementById("top3List");

        if (top3.length === 0) {
            document.getElementById("top3FloatingPanel").style.display = "none";
            return;
        }

        document.getElementById("top3FloatingPanel").style.display = "flex";

        listDiv.innerHTML = top3.map((p, idx) => {
            const rank = idx + 1;
            const rankText = rank === 1 ? "1º" : rank === 2 ? "2º" : "3º";

            const avatarHtml = p.avatar
                ? `<img src="${p.avatar}" class="top3-avatar" onclick="openProfile('${escHtml(p.player)}')" title="Clique para ver perfil">`
                : `<i class="fas fa-user-circle top3-avatar" style="font-size: 56px; display: flex; align-items: center; justify-content: center; color: #666; border: 2px solid transparent; cursor: pointer;" onclick="openProfile('${escHtml(p.player)}')"></i>`;

            return `
                <div class="top3-item rank-${rank}" data-tooltip="${escHtml(p.player)} - ${escHtml(p.kills)} kills">
                    ${avatarHtml}
                    <div class="top3-medal">${rankText}</div>
                </div>
            `;
        }).join("");
    } catch (e) {
        console.error("Erro ao carregar top 3:", e);
    }
}

async function fetchServerStatus() {
    try {
        const response = await fetch(`${API_URL}/server-status`);
        const data = await response.json();
        if (data.default_timelimit !== undefined) {
            defaultTimelimit = data.default_timelimit;
            document.getElementById("voteTimelimit").placeholder = defaultTimelimit;
        }
        if (data.default_fraglimit !== undefined) {
            defaultFraglimit = data.default_fraglimit;
            document.getElementById("voteFraglimit").placeholder = defaultFraglimit;
        }
    } catch (e) {
        console.error("Erro ao obter status do servidor:", e);
    }
}

fetchServerStatus();
resetDailyVotes();
renderMaps();
setupWeaponButtons();
setupFriendlyFireButtons();
fetchVotes();
loadTop3Ranking();

setInterval(updateServerStatus, 15000); // Polling cada 15s pro live server
updateServerStatus();
setInterval(loadTop3Ranking, 30000); // Polling cada 30s pro ranking top 3

setInterval(() => {
    if (document.getElementById("killRankingPanel").classList.contains("open")) {
        fetchKills(activeKillTab);
    }
}, 15000);
// --- Claim Profile & Avatar Upload ---
document.getElementById("myProfileBtn").onclick = () => {
    document.getElementById("claimModal").style.display = "flex";
    const saved = JSON.parse(localStorage.getItem("urban_profile") || "null");
    if (saved) {
        showUploadForm(saved.name, saved.code);
    }
};

document.getElementById("claimClose").onclick = () => {
    document.getElementById("claimModal").style.display = "none";
};

async function handleClaim() {
    const name = document.getElementById("claimName").value.trim();
    const code = document.getElementById("claimCode").value.trim();
    if (!name || !code) return alert("Preencha todos os campos.");

    try {
        const res = await fetch(`${API_URL}/claim-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, code })
        });
        if (res.ok) {
            localStorage.setItem("urban_profile", JSON.stringify({ name, code }));
            showUploadForm(name, code);
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert("Erro na conexão.");
    }
}

function showUploadForm(name, code) {
    document.getElementById("claimForm").style.display = "none";
    document.getElementById("uploadForm").style.display = "block";
    document.getElementById("authenticatedName").innerText = name;
}

function logoutClaim() {
    localStorage.removeItem("urban_profile");
    document.getElementById("claimForm").style.display = "block";
    document.getElementById("uploadForm").style.display = "none";
}

let avatarCropper = null;
let cropperMinZoom = 0;
let cropperMaxZoom = 0;

document.getElementById("avatarInput").onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const cropImage = document.getElementById("cropImage");
            cropImage.src = ev.target.result;
            document.getElementById("previewImg").dataset.original = ev.target.result;

            // Show crop modal
            document.getElementById("cropModal").style.display = "flex";

            // Destroy existing cropper if any
            if (avatarCropper) {
                avatarCropper.destroy();
                avatarCropper = null;
            }

            // Initialize Cropper.js after modal displays
            setTimeout(() => {
                avatarCropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.8,
                    restore: false,
                    guides: false,
                    center: false,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    ready() {
                        const imageData = avatarCropper.getImageData();
                        cropperMinZoom = imageData.width / imageData.naturalWidth;
                        cropperMaxZoom = cropperMinZoom * 4;
                        document.getElementById("zoomSlider").value = 0;
                    },
                    zoom(event) {
                        if (cropperMinZoom && cropperMaxZoom) {
                            const ratio = event.detail.ratio;
                            const pct = ((ratio - cropperMinZoom) / (cropperMaxZoom - cropperMinZoom)) * 100;
                            document.getElementById("zoomSlider").value = Math.max(0, Math.min(100, pct));
                        }
                    }
                });
            }, 50);
        };
        reader.readAsDataURL(file);
    }
};

// Bind Zoom Controls
document.getElementById("zoomInBtn").onclick = () => {
    if (avatarCropper) avatarCropper.zoom(0.1);
};

document.getElementById("zoomOutBtn").onclick = () => {
    if (avatarCropper) avatarCropper.zoom(-0.1);
};

document.getElementById("zoomSlider").oninput = (e) => {
    if (avatarCropper && cropperMinZoom && cropperMaxZoom) {
        const val = parseFloat(e.target.value);
        const targetZoom = cropperMinZoom + (val / 100) * (cropperMaxZoom - cropperMinZoom);
        avatarCropper.zoomTo(targetZoom);
    }
};

document.getElementById("cropClose").onclick = () => {
    document.getElementById("cropModal").style.display = "none";
    if (avatarCropper) {
        avatarCropper.destroy();
        avatarCropper = null;
    }
    document.getElementById("avatarInput").value = "";
};

document.getElementById("cropConfirmBtn").onclick = () => {
    if (avatarCropper) {
        const canvas = avatarCropper.getCroppedCanvas({
            width: 300,
            height: 300
        });

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        document.getElementById("previewImg").src = croppedDataUrl;
        document.getElementById("uploadPreview").style.display = "block";

        // Hide modal and cleanup
        document.getElementById("cropModal").style.display = "none";
        avatarCropper.destroy();
        avatarCropper = null;
    }
};

async function handleUpload() {
    const saved = JSON.parse(localStorage.getItem("urban_profile"));
    const imgData = document.getElementById("previewImg").src;
    const originalImgData = document.getElementById("previewImg").dataset.original;
    if (!saved || !imgData) return;

    try {
        const res = await fetch(`${API_URL}/upload-avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: saved.name,
                code: saved.code,
                image: imgData,
                originalImage: originalImgData
            })
        });
        if (res.ok) {
            alert("Foto salva com sucesso!");
            location.reload();
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert("Erro ao enviar imagem.");
    }
}

// Close modals on clicking outside the content area or pressing Escape
window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
        // Specific cleanup for crop modal if closed this way
        if (e.target.id === "cropModal" && avatarCropper) {
            avatarCropper.destroy();
            avatarCropper = null;
            document.getElementById("avatarInput").value = "";
        }
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal").forEach(modal => {
            modal.style.display = "none";
            if (modal.id === "cropModal" && avatarCropper) {
                avatarCropper.destroy();
                avatarCropper = null;
                document.getElementById("avatarInput").value = "";
            }
        });
    }
});

// Initialize comparison event listeners
initCompareEvents();
