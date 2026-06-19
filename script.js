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
    const compareMeBtn = document.getElementById("profileCompareMeBtn");
    const closeBtn = document.getElementById("closeCompareBtn");
    const compLayout = document.getElementById("profileComparisonLayout");
    const normalLayout = document.querySelector(".profile-body-layout");
    
    if (selectorContainer) selectorContainer.style.display = "none";
    if (compareBtn) {
        compareBtn.style.display = "inline-flex";
        compareBtn.disabled = false;
    }
    if (compareMeBtn) {
        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        const currentProfileName = activeProfileData ? activeProfileData.player : "";
        const myIdentifier = auth ? (auth.player_name || auth.username) : null;
        if (myIdentifier && myIdentifier !== currentProfileName) {
            compareMeBtn.style.display = "inline-flex";
        } else {
            compareMeBtn.style.display = "none";
        }
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
    
    let numA = parseFloat(valA);
    let numB = parseFloat(valB);
    
    if (isNaN(numA)) numA = 0;
    if (isNaN(numB)) numB = 0;
    
    if (label === "Tempo de Reação") {
        if (numA === 0 && numB > 0) {
            winnerClassB = "winner";
        } else if (numB === 0 && numA > 0) {
            winnerClassA = "winner";
        } else if (numA > 0 && numB > 0 && numA !== numB) {
            if (numA < numB) winnerClassA = "winner";
            else winnerClassB = "winner";
        }
    } else {
        if (numA !== numB) {
            if (higherIsBetter) {
                if (numA > numB) winnerClassA = "winner";
                else winnerClassB = "winner";
            } else {
                if (numA < numB) winnerClassA = "winner";
                else winnerClassB = "winner";
            }
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

    const minigamesHtml = `
    <div class="comparison-section">
        <h4 class="comparison-section-title"><i class="fas fa-gamepad"></i> Duelo de Minigames</h4>
        <div class="comparison-stats-box">
            ${getStatRowHtml("Treino de Mira", `${playerA.aimHighscore || 0} pts`, `${playerB.aimHighscore || 0} pts`, true)}
            ${getStatRowHtml("Tempo de Reação", playerA.reactionHighscore ? `${playerA.reactionHighscore} ms` : "Sem recorde", playerB.reactionHighscore ? `${playerB.reactionHighscore} ms` : "Sem recorde", false)}
            ${getStatRowHtml("Controle de Recuo", `${playerA.sprayHighscore || 0}%`, `${playerB.sprayHighscore || 0}%`, true)}
            ${getStatRowHtml("Amigo ou Inimigo", `${playerA.fofHighscore || 0} pts`, `${playerB.fofHighscore || 0} pts`, true)}
            ${getStatRowHtml("Trajetória de Granada", `${playerA.grenadeHighscore || 0} pts`, `${playerB.grenadeHighscore || 0} pts`, true)}
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
        ${minigamesHtml}
        ${heatmapsHtml}
        ${achievementsSectionHtml}
    `;
    comparisonLayout.style.display = "flex";
    
    colorMiniHeatmap(document.getElementById("compHeatmapA"), playerA.hitLocations);
    colorMiniHeatmap(document.getElementById("compHeatmapB"), playerB.hitLocations);
}

function initCompareEvents() {
    const compareBtn = document.getElementById("profileCompareBtn");
    const compareMeBtn = document.getElementById("profileCompareMeBtn");
    const selectEl = document.getElementById("comparePlayerSelect");
    const closeBtn = document.getElementById("closeCompareBtn");
    
    if (compareBtn) {
        compareBtn.onclick = async () => {
            compareBtn.style.display = "none";
            if (compareMeBtn) compareMeBtn.style.display = "none";
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
    
    if (compareMeBtn) {
        compareMeBtn.onclick = async () => {
            const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
            const myIdentifier = auth ? (auth.player_name || auth.username) : null;
            if (!myIdentifier) return;
            
            compareBtn.style.display = "none";
            compareMeBtn.style.display = "none";
            if (closeBtn) closeBtn.style.display = "inline-block";
            
            try {
                const normalLayout = document.querySelector(".profile-body-layout");
                if (normalLayout) normalLayout.style.display = "none";
                
                const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(myIdentifier)}`);
                const opponentData = await res.json();
                
                if (activeProfileData) {
                    renderComparison(activeProfileData, opponentData);
                }
            } catch (e) {
                console.error("Erro ao comparar comigo", e);
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

        const compareMeBtn = document.getElementById("profileCompareMeBtn");
        if (compareMeBtn) {
            const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
            const myIdentifier = auth ? (auth.player_name || auth.username) : null;
            if (myIdentifier && myIdentifier !== playerName) {
                compareMeBtn.style.display = "inline-flex";
                compareMeBtn.disabled = false;
            } else {
                compareMeBtn.style.display = "none";
            }
        }

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
// --- Auth System & Account Management ---
document.getElementById("myProfileBtn").onclick = () => {
    openAccountMgmtModal();
};

const viewMyProfileBtn = document.getElementById("viewMyProfileBtn");
if (viewMyProfileBtn) {
    viewMyProfileBtn.onclick = () => {
        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        if (auth) {
            document.getElementById("accountMgmtModal").style.display = "none";
            openProfile(auth.player_name || auth.username);
        }
    };
}

document.getElementById("accountMgmtClose").onclick = () => {
    document.getElementById("accountMgmtModal").style.display = "none";
};

function checkSession() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    const loggedOutDiv = document.getElementById("authLoggedOut");
    const loggedInDiv = document.getElementById("authLoggedIn");
    
    if (auth && auth.session_token) {
        if (loggedOutDiv) loggedOutDiv.style.display = "none";
        if (loggedInDiv) loggedInDiv.style.display = "flex";
        
        const userEl = document.getElementById("loggedInUsername");
        if (userEl) userEl.innerText = auth.username;
        
        const badge = document.getElementById("linkedPlayerBadge");
        if (badge) {
            if (auth.player_name) {
                badge.style.display = "inline-flex";
                badge.innerHTML = `<i class="fas fa-gamepad"></i> ${auth.player_name}`;
            } else {
                badge.style.display = "none";
                
                // If not linked yet, check for old session urban_profile in localStorage to auto-link
                const savedProfile = JSON.parse(localStorage.getItem("urban_profile") || "null");
                if (savedProfile && savedProfile.name && savedProfile.code) {
                    console.log("[INFO] Autolinking player on checkSession:", savedProfile.name);
                    fetch(`${API_URL}/link-player`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: auth.username,
                            session_token: auth.session_token,
                            player_name: savedProfile.name,
                            auth_code: savedProfile.code
                        })
                    })
                    .then(res => {
                        if (res.ok) return res.json();
                    })
                    .then(data => {
                        if (data && data.player_name) {
                            auth.player_name = data.player_name;
                            localStorage.setItem("urban_auth", JSON.stringify(auth));
                            localStorage.removeItem("urban_profile");
                            location.reload();
                        }
                    })
                    .catch(err => console.error("Erro no auto-vinculo:", err));
                }
            }
        }
    } else {
        if (loggedOutDiv) loggedOutDiv.style.display = "flex";
        if (loggedInDiv) loggedInDiv.style.display = "none";
        window.location.href = "login.html";
    }
}

window.openAccountMgmtModal = openAccountMgmtModal;
window.handleLinkCharacter = handleLinkCharacter;
window.handleRenameCharacter = handleRenameCharacter;
window.handleLogout = handleLogout;

function openAccountMgmtModal() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    document.getElementById("accountMgmtModal").style.display = "flex";
    document.getElementById("mgmtUsername").innerText = auth.username;
    
    const linkedPlayerSection = document.getElementById("mgmtLinkedPlayerSection");
    const linkedActions = document.getElementById("mgmtLinkedActions");
    const unlinkedActions = document.getElementById("mgmtUnlinkedActions");
    
    if (auth.player_name) {
        linkedPlayerSection.innerHTML = `<p style="margin: 0; color: #00ff99; font-size: 0.9em;"><i class="fas fa-link"></i> Vinculado a: <strong>${auth.player_name}</strong></p>`;
        linkedActions.style.display = "block";
        unlinkedActions.style.display = "none";
    } else {
        linkedPlayerSection.innerHTML = `<p style="margin: 0; color: #ffaa00; font-size: 0.9em;"><i class="fas fa-exclamation-triangle"></i> Nenhum personagem vinculado</p>`;
        linkedActions.style.display = "none";
        unlinkedActions.style.display = "block";
    }

    const activeName = auth.player_name || auth.username;
    fetch(`${API_URL}/profile?player=${encodeURIComponent(activeName)}`)
        .then(res => res.json())
        .then(data => {
            const preview = document.getElementById("mgmtAvatarPreview");
            if (data.avatar) {
                preview.src = data.avatar;
            } else {
                preview.src = "img/default_avatar.png";
            }
        })
        .catch(() => {
            document.getElementById("mgmtAvatarPreview").src = "img/default_avatar.png";
        });
}

async function handleLinkCharacter() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    const playerName = document.getElementById("mgmtLinkNick").value.trim();
    const code = document.getElementById("mgmtLinkCode").value.trim();
    
    if (!playerName || !code) return alert("Preencha o nick e o código.");
    
    try {
        const res = await fetch(`${API_URL}/link-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: auth.username,
                session_token: auth.session_token,
                player_name: playerName,
                auth_code: code
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            auth.player_name = data.player_name;
            localStorage.setItem("urban_auth", JSON.stringify(auth));
            
            document.getElementById("mgmtLinkNick").value = "";
            document.getElementById("mgmtLinkCode").value = "";
            
            checkSession();
            openAccountMgmtModal();
            alert("Personagem vinculado com sucesso!");
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert("Erro na conexão.");
    }
}

async function handleRenameCharacter() {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    const newName = document.getElementById("mgmtNewNick").value.trim();
    const code = document.getElementById("mgmtNewNickCode").value.trim();
    
    if (!newName || !code) return alert("Preencha o novo nick e o novo código (!auth).");
    
    try {
        const res = await fetch(`${API_URL}/rename-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: auth.username,
                session_token: auth.session_token,
                new_player_name: newName,
                auth_code: code
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            auth.player_name = data.player_name;
            localStorage.setItem("urban_auth", JSON.stringify(auth));
            
            document.getElementById("mgmtNewNick").value = "";
            document.getElementById("mgmtNewNickCode").value = "";
            
            checkSession();
            openAccountMgmtModal();
            alert("Personagem renomeado e histórico migrado com sucesso!");
            location.reload();
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert("Erro na conexão.");
    }
}

function handleLogout() {
    localStorage.removeItem("urban_auth");
    checkSession();
    document.getElementById("accountMgmtModal").style.display = "none";
    alert("Sessão encerrada.");
}

let avatarCropper = null;
let cropperMinZoom = 0;
let cropperMaxZoom = 0;

document.getElementById("mgmtAvatarInput").onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const cropImage = document.getElementById("cropImage");
            cropImage.src = ev.target.result;
            document.getElementById("mgmtAvatarPreview").dataset.original = ev.target.result;

            document.getElementById("cropModal").style.display = "flex";

            if (avatarCropper) {
                avatarCropper.destroy();
                avatarCropper = null;
            }

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
    document.getElementById("mgmtAvatarInput").value = "";
};

document.getElementById("cropConfirmBtn").onclick = () => {
    if (avatarCropper) {
        const canvas = avatarCropper.getCroppedCanvas({
            width: 300,
            height: 300
        });

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        document.getElementById("mgmtAvatarPreview").src = croppedDataUrl;
        
        document.getElementById("cropModal").style.display = "none";
        avatarCropper.destroy();
        avatarCropper = null;
        
        handleAvatarUploadSubmit(croppedDataUrl, document.getElementById("mgmtAvatarPreview").dataset.original);
    }
};

async function handleAvatarUploadSubmit(imgData, originalImgData) {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    const activeName = auth.player_name || auth.username;
    if (!activeName) return;
    
    try {
        const res = await fetch(`${API_URL}/upload-avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: activeName,
                username: auth.username,
                session_token: auth.session_token,
                image: imgData,
                originalImage: originalImgData
            })
        });
        if (res.ok) {
            alert("Foto de perfil atualizada!");
            location.reload();
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert("Erro ao enviar imagem.");
    }
}

window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal") && e.target.id !== "minigamesModal") {
        e.target.style.display = "none";
        if (e.target.id === "cropModal" && avatarCropper) {
            avatarCropper.destroy();
            avatarCropper = null;
            document.getElementById("mgmtAvatarInput").value = "";
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
                document.getElementById("mgmtAvatarInput").value = "";
            }
            if (modal.id === "minigamesModal") {
                stopAllMinigames();
            }
        });
    }
});

// Initialize comparison event listeners
initCompareEvents();

// ── Minigames Logic (Aim Trainer) ──

let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playHitSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
        console.error("Erro ao tocar som de hit:", e);
    }
}

function playMissSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
        console.error("Erro ao tocar som de miss:", e);
    }
}

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

document.getElementById("minigamesBtn").onclick = () => {
    // Close other panels
    document.getElementById("killRankingPanel").classList.remove("open");
    document.getElementById("historyPanel").classList.remove("open");
    const allMatchesBtn = document.getElementById("openAllMatchesBtn");
    if (allMatchesBtn) allMatchesBtn.style.display = "none";
    
    document.getElementById("minigamesModal").style.display = "flex";
    showMinigamesMenu();
};

document.getElementById("minigamesClose").onclick = () => {
    document.getElementById("minigamesModal").style.display = "none";
    stopAllMinigames();
};

function showMinigamesMenu() {
    stopAllMinigames();
    document.getElementById("minigamesMenu").style.display = "block";
    document.getElementById("aimTrainerGame").style.display = "none";
    document.getElementById("reactionTrainerGame").style.display = "none";
    document.getElementById("sprayTrainerGame").style.display = "none";
    document.getElementById("fofTrainerGame").style.display = "none";
    document.getElementById("grenadeTrainerGame").style.display = "none";
    
    const aimHighScores = JSON.parse(localStorage.getItem("aim_trainer_highscores") || "{}");
    let maxAim = 0;
    Object.values(aimHighScores).forEach(score => {
        if (score > maxAim) maxAim = score;
    });

    const localReaction = parseInt(localStorage.getItem("reaction_highscore") || "0");
    const localSpray = parseInt(localStorage.getItem("spray_highscore") || "0");
    const localFof = parseInt(localStorage.getItem("fof_highscore") || "0");
    const localGrenade = parseInt(localStorage.getItem("grenade_highscore") || "0");

    document.getElementById("aimTrainerHighScore").innerText = maxAim;
    document.getElementById("reactionHighScore").innerText = localReaction > 0 ? `${localReaction} ms` : "Sem recorde";
    document.getElementById("sprayHighScore").innerText = localSpray > 0 ? `${localSpray}%` : "0%";
    document.getElementById("fofHighScore").innerText = localFof;
    document.getElementById("grenadeHighScore").innerText = localGrenade;

    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (auth && auth.player_name) {
        fetch(`${API_URL}/profile?player=${encodeURIComponent(auth.player_name)}`)
            .then(res => res.json())
            .then(data => {
                if (data) {
                    const dbAim = data.aimHighscore || 0;
                    const dbReaction = data.reactionHighscore || 0;
                    const dbSpray = data.sprayHighscore || 0;
                    const dbFof = data.fofHighscore || 0;
                    const dbGrenade = data.grenadeHighscore || 0;

                    if (dbAim > maxAim) {
                        maxAim = dbAim;
                        document.getElementById("aimTrainerHighScore").innerText = maxAim;
                    }
                    if (dbReaction > 0 && (localReaction === 0 || dbReaction < localReaction)) {
                        localStorage.setItem("reaction_highscore", dbReaction);
                        document.getElementById("reactionHighScore").innerText = `${dbReaction} ms`;
                    }
                    if (dbSpray > localSpray) {
                        localStorage.setItem("spray_highscore", dbSpray);
                        document.getElementById("sprayHighScore").innerText = `${dbSpray}%`;
                    }
                    if (dbFof > localFof) {
                        localStorage.setItem("fof_highscore", dbFof);
                        document.getElementById("fofHighScore").innerText = dbFof;
                    }
                    if (dbGrenade > localGrenade) {
                        localStorage.setItem("grenade_highscore", dbGrenade);
                        document.getElementById("grenadeHighScore").innerText = dbGrenade;
                    }
                }
            })
            .catch(err => console.error("Erro ao sincronizar recordes com banco:", err));
    }
}

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
    
    // Set up click handler on the playground (for miss counting)
    targetArea.onclick = handlePlaygroundClick;
    
    // Start game timer
    aimGameTimerId = setInterval(() => {
        aimTimerValue--;
        document.getElementById("gameTimer").innerText = aimTimerValue + "s";
        if (aimTimerValue <= 0) {
            stopAimTrainer(true);
        }
    }, 1000);
    
    // Spawn 3 initial targets
    for (let i = 0; i < 3; i++) {
        spawnTarget();
    }
    
    // Physics / Movement loop
    lastFrameTime = performance.now();
    aimAnimationId = requestAnimationFrame(updateTargetsPhysics);
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
        
        // Spawn a replacement target immediately
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
checkSession();


/* ─── NEW MINIGAMES IMPLEMENTATION ─── */

// Special sound effects
function playFriendHitSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        console.error(e);
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

// Stop all running games
function stopAllMinigames() {
    stopAimTrainer(false);
    stopReactionTrainer(false);
    stopSprayTrainer(false);
    stopFofGame(false);
    stopGrenadeGame(false);
}

// ──────────────────────────────────────────
// 1. TESTE DE REAÇÃO (REACTION TIME)
// ──────────────────────────────────────────
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


// ──────────────────────────────────────────
// 2. CONTROLE DE RECUO (SPRAY CONTROL)
// ──────────────────────────────────────────
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


// ──────────────────────────────────────────
// 3. AMIGO OU INIMIGO (FRIEND-OR-FOE)
// ──────────────────────────────────────────
let fofGameRunning = false;
let fofScore = 0;
let fofTimeLimit = 30;
let fofTimerValue = 0;
let fofTimerId = null;
let fofSpawnTimerId = null;
let fofHits = 0;
let fofClicks = 0;
let fofFriendsHit = 0;
let fofEnemiesKilled = 0;
let fofTargets = [];
let nextFofTargetId = 1;

function startFofTrainerMenu() {
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("fofTrainerGame").style.display = "block";
    document.getElementById("fofTrainerSetup").style.display = "block";
    document.getElementById("fofTrainerPlayground").style.display = "none";
    document.getElementById("fofGameOver").style.display = "none";
    
    const saved = parseInt(localStorage.getItem("fof_highscore") || "0");
    document.getElementById("fofGameHighScore").innerText = saved;
}

function startFofGame() {
    if (fofGameRunning) return;
    
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
        ctx.resume();
    }
    
    fofGameRunning = true;
    fofScore = 0;
    fofHits = 0;
    fofClicks = 0;
    fofFriendsHit = 0;
    fofEnemiesKilled = 0;
    fofTimerValue = fofTimeLimit;
    fofTargets = [];
    nextFofTargetId = 1;
    
    document.getElementById("fofTrainerSetup").style.display = "none";
    document.getElementById("fofTrainerPlayground").style.display = "block";
    document.getElementById("fofGameOver").style.display = "none";
    
    document.getElementById("fofLiveScore").innerText = "0";
    document.getElementById("fofLiveTimer").innerText = fofTimerValue + "s";
    document.getElementById("fofLiveAccuracy").innerText = "0 / 0";
    
    const targetArea = document.getElementById("fofTargetArea");
    targetArea.innerHTML = "";
    
    targetArea.onclick = handleFofPlaygroundClick;
    
    fofTimerId = setInterval(() => {
        fofTimerValue--;
        document.getElementById("fofLiveTimer").innerText = fofTimerValue + "s";
        if (fofTimerValue <= 0) {
            stopFofGame(true);
        }
    }, 1000);
    
    spawnFofTarget();
    fofSpawnTimerId = setInterval(spawnFofTarget, 650);
}

function handleFofPlaygroundClick(e) {
    if (!fofGameRunning) return;
    if (e.target.id === "fofTargetArea") {
        fofClicks++;
        fofScore = Math.max(0, fofScore - 20);
        playMissSound();
        createFofMissRipple(e.clientX, e.clientY);
        createFofFloatingText(e.clientX, e.clientY, "-20", "#ff3333");
        updateFofLiveStats();
    }
}

function updateFofLiveStats() {
    document.getElementById("fofLiveScore").innerText = fofScore;
    document.getElementById("fofLiveAccuracy").innerText = `${fofEnemiesKilled} / ${fofClicks}`;
}

function spawnFofTarget() {
    if (!fofGameRunning) return;
    
    const targetArea = document.getElementById("fofTargetArea");
    
    const isEnemy = Math.random() < 0.70;
    const type = isEnemy ? "enemy" : "friend";
    
    const minX = 10;
    const maxX = 90;
    const minY = 10;
    const maxY = 90;
    
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    
    const targetId = nextFofTargetId++;
    
    const targetEl = document.createElement("div");
    targetEl.className = `aim-target fof-target fof-${type}`;
    targetEl.id = `fof-target-${targetId}`;
    targetEl.style.left = x + "%";
    targetEl.style.top = y + "%";
    targetEl.style.position = "absolute";
    targetEl.style.width = "40px";
    targetEl.style.height = "40px";
    targetEl.style.borderRadius = "50%";
    targetEl.style.cursor = "pointer";
    targetEl.style.display = "flex";
    targetEl.style.alignItems = "center";
    targetEl.style.justifyContent = "center";
    targetEl.style.transform = "translate(-50%, -50%)";
    targetEl.style.animation = "targetSpawn 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    
    if (isEnemy) {
        targetEl.style.background = "radial-gradient(circle, #ff4444 0%, #cc0000 100%)";
        targetEl.style.boxShadow = "0 0 10px rgba(255, 68, 68, 0.6)";
        targetEl.innerHTML = '<i class="fas fa-skull" style="color: white; font-size: 0.95em;"></i>';
    } else {
        targetEl.style.background = "radial-gradient(circle, #2563eb 0%, #1e40af 100%)";
        targetEl.style.boxShadow = "0 0 10px rgba(37, 99, 235, 0.6)";
        targetEl.innerHTML = '<i class="fas fa-shield" style="color: white; font-size: 0.95em;"></i>';
    }
    
    targetArea.appendChild(targetEl);
    
    const targetObj = {
        id: targetId,
        type: type,
        spawnTime: performance.now(),
        element: targetEl
    };
    
    fofTargets.push(targetObj);
    
    targetEl.onclick = (e) => {
        e.stopPropagation();
        handleFofTargetClick(targetObj, e.clientX, e.clientY);
    };
    
    setTimeout(() => {
        if (targetEl && targetEl.parentNode) {
            fofTargets = fofTargets.filter(t => t.id !== targetId);
            targetEl.remove();
            
            if (isEnemy && fofGameRunning) {
                fofScore = Math.max(0, fofScore - 50);
                const rect = targetArea.getBoundingClientRect();
                const floatX = rect.left + (x/100)*rect.width;
                const floatY = rect.top + (y/100)*rect.height;
                createFofFloatingText(floatX, floatY, "-50", "#ff3333");
                updateFofLiveStats();
            }
        }
    }, 1500);
}

function handleFofTargetClick(target, clickX, clickY) {
    if (!fofGameRunning) return;
    
    fofClicks++;
    
    if (target.element && target.element.parentNode) {
        target.element.remove();
    }
    fofTargets = fofTargets.filter(t => t.id !== target.id);
    
    if (target.type === "enemy") {
        fofHits++;
        fofEnemiesKilled++;
        fofScore += 100;
        playHitSound();
        createFofHitRipple(clickX, clickY);
        createFofFloatingText(clickX, clickY, "+100", "#00ff99");
    } else {
        fofFriendsHit++;
        fofScore = Math.max(0, fofScore - 150);
        playFriendHitSound();
        createFofMissRipple(clickX, clickY);
        createFofFloatingText(clickX, clickY, "-150", "#ff3333");
    }
    
    updateFofLiveStats();
}

function stopFofGame(finished = false) {
    fofGameRunning = false;
    
    if (fofTimerId) {
        clearInterval(fofTimerId);
        fofTimerId = null;
    }
    if (fofSpawnTimerId) {
        clearInterval(fofSpawnTimerId);
        fofSpawnTimerId = null;
    }
    
    const targetArea = document.getElementById("fofTargetArea");
    if (targetArea) {
        targetArea.onclick = null;
        targetArea.innerHTML = "";
    }
    
    if (finished) {
        document.getElementById("fofEndScore").innerText = fofScore;
        document.getElementById("fofEndEnemiesKilled").innerText = fofEnemiesKilled;
        document.getElementById("fofEndFriendsHit").innerText = fofFriendsHit;
        
        document.getElementById("fofTrainerPlayground").style.display = "none";
        document.getElementById("fofGameOver").style.display = "block";
        
        const oldScore = parseInt(localStorage.getItem("fof_highscore") || "0");
        let isNewHighScore = false;
        if (fofScore > oldScore) {
            localStorage.setItem("fof_highscore", fofScore);
            document.getElementById("fofGameHighScore").innerText = fofScore;
            isNewHighScore = true;
        }
        
        const flash = document.getElementById("newFofHighScoreFlash");
        if (isNewHighScore) {
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
                    game_type: "fof",
                    highscore: fofScore
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok" && data.updated) {
                    localStorage.setItem("fof_highscore", data.highscore);
                    document.getElementById("fofGameHighScore").innerText = data.highscore;
                    flash.style.display = "block";
                }
            })
            .catch(err => console.error("Erro ao salvar recorde no banco:", err));
        }
    }
}

function createFofHitRipple(clientX, clientY) {
    const area = document.getElementById("fofTargetArea");
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

function createFofMissRipple(clientX, clientY) {
    const area = document.getElementById("fofTargetArea");
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

function createFofFloatingText(clientX, clientY, text, color) {
    const area = document.getElementById("fofTargetArea");
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

// ──────────────────────────────────────────
// 5. TRAJETÓRIA DE GRANADA (GRENADE TRAJECTORY)
// ──────────────────────────────────────────

// Audio Synthesizers for Grenade
function playPinPullSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(1000, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.15);
        
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.15);
    } catch(e) {}
}

function playGrenadeBounceSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
}

function playGrenadeExplosionSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.8);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noiseNode.start();
        noiseNode.stop(ctx.currentTime + 0.8);
    } catch(e) {}
}

// Game State Variables
let grenadeGameRunning = false;
let grenadeRoundTransitioning = false;
let grenadeLaunchCount = 0;
let grenadeScoreTotal = 0;
let grenadeBestLaunchScore = 0;
let grenadeDistances = [];
let grenadeActive = false;
let grenadeX = 0;
let grenadeY = 0;
let grenadeVx = 0;
let grenadeVy = 0;
const grenadeRadius = 8;
const grenadeElasticity = 0.65;
let grenadeBounces = 0;
let grenadeTrail = [];
let grenadeObstacles = [];
let grenadeTarget = { x: 480, y: 320, r: 25 };
const grenadeLaunchOrigin = { x: 50, y: 330 };
let grenadeTimer = 0;

// Drag variables
let grenadeDragging = false;
let grenadeDragStart = { x: 0, y: 0 };
let grenadeDragCurrent = { x: 0, y: 0 };

// Animation explosion variables
let explosionActive = false;
let explosionX = 0;
let explosionY = 0;
let explosionRadius = 0;
let explosionMaxRadius = 60;
let explosionParticles = [];

// Canvas context
let grenadeCanvas = null;
let grenadeCtx = null;
let grenadeAnimFrameId = null;

function startGrenadeTrainerMenu() {
    stopAllMinigames();
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("grenadeTrainerGame").style.display = "block";
    document.getElementById("grenadeTrainerSetup").style.display = "block";
    document.getElementById("grenadeTrainerPlayground").style.display = "none";
    document.getElementById("grenadeGameOver").style.display = "none";
    
    const localHighScore = parseInt(localStorage.getItem("grenade_highscore") || "0");
    document.getElementById("grenadeGameHighScore").innerText = localHighScore;
}

function startGrenadeGame() {
    stopAllMinigames();
    grenadeGameRunning = true;
    grenadeRoundTransitioning = false;
    grenadeLaunchCount = 1;
    grenadeScoreTotal = 0;
    grenadeBestLaunchScore = 0;
    grenadeDistances = [];
    grenadeActive = false;
    explosionActive = false;
    grenadeTrail = [];
    
    document.getElementById("grenadeTrainerSetup").style.display = "none";
    document.getElementById("grenadeGameOver").style.display = "none";
    document.getElementById("grenadeTrainerPlayground").style.display = "block";
    
    document.getElementById("grenadeLaunchCount").innerText = "1 / 5";
    document.getElementById("grenadeLastDist").innerText = "0 m";
    document.getElementById("grenadeLiveScore").innerText = "0 pts";
    
    document.getElementById("grenadeInstructionOverlay").style.opacity = "1";
    
    grenadeCanvas = document.getElementById("grenadeCanvas");
    grenadeCtx = grenadeCanvas.getContext("2d");
    
    grenadeCanvas.removeEventListener("mousedown", handleGrenadeMouseDown);
    window.removeEventListener("mousemove", handleGrenadeMouseMove);
    window.removeEventListener("mouseup", handleGrenadeMouseUp);
    
    grenadeCanvas.removeEventListener("touchstart", handleGrenadeTouchStart);
    window.removeEventListener("touchmove", handleGrenadeTouchMove);
    window.removeEventListener("touchend", handleGrenadeTouchEnd);
    
    grenadeCanvas.addEventListener("mousedown", handleGrenadeMouseDown);
    window.addEventListener("mousemove", handleGrenadeMouseMove);
    window.addEventListener("mouseup", handleGrenadeMouseUp);
    
    grenadeCanvas.addEventListener("touchstart", handleGrenadeTouchStart, { passive: true });
    window.addEventListener("touchmove", handleGrenadeTouchMove, { passive: true });
    window.addEventListener("touchend", handleGrenadeTouchEnd, { passive: true });
    
    generateGrenadeLayout(1);
    
    if (grenadeAnimFrameId) cancelAnimationFrame(grenadeAnimFrameId);
    grenadeAnimFrameId = requestAnimationFrame(grenadeGameLoop);
}

function generateGrenadeLayout(round) {
    grenadeObstacles = [];
    if (round === 1) {
        grenadeObstacles.push({ x: 270, y: 160, w: 40, h: 220 });
        grenadeTarget = { x: 480, y: 330, r: 25 };
    } else if (round === 2) {
        grenadeObstacles.push({ x: 220, y: 0, w: 100, h: 180 });
        grenadeObstacles.push({ x: 380, y: 260, w: 50, h: 120 });
        grenadeTarget = { x: 500, y: 340, r: 25 };
    } else if (round === 3) {
        grenadeObstacles.push({ x: 260, y: 0, w: 40, h: 140 });
        grenadeObstacles.push({ x: 260, y: 240, w: 40, h: 140 });
        grenadeTarget = { x: 490, y: 340, r: 25 };
    } else if (round === 4) {
        grenadeObstacles.push({ x: 240, y: 120, w: 60, h: 260 });
        grenadeTarget = { x: 460, y: 340, r: 25 };
    } else {
        grenadeObstacles.push({ x: 220, y: 220, w: 50, h: 160 });
        grenadeObstacles.push({ x: 360, y: 0, w: 60, h: 180 });
        grenadeTarget = { x: 520, y: 340, r: 25 };
    }
    grenadeActive = false;
    explosionActive = false;
    grenadeTrail = [];
}

function getCanvasMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function handleGrenadeMouseDown(e) {
    if (!grenadeGameRunning || grenadeActive || explosionActive || grenadeRoundTransitioning) return;
    const pos = getCanvasMousePos(grenadeCanvas, e);
    grenadeDragging = true;
    grenadeDragStart = pos;
    grenadeDragCurrent = pos;
    
    // Hide overlay immediately when aiming starts
    document.getElementById("grenadeInstructionOverlay").style.opacity = "0";
}

function handleGrenadeMouseMove(e) {
    if (!grenadeDragging) return;
    grenadeDragCurrent = getCanvasMousePos(grenadeCanvas, e);
}

function handleGrenadeMouseUp(e) {
    if (!grenadeDragging) return;
    grenadeDragging = false;
    
    const dx = grenadeDragStart.x - grenadeDragCurrent.x;
    const dy = grenadeDragStart.y - grenadeDragCurrent.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 15) {
        document.getElementById("grenadeInstructionOverlay").style.opacity = "0";
        
        grenadeActive = true;
        grenadeX = grenadeLaunchOrigin.x;
        grenadeY = grenadeLaunchOrigin.y;
        
        const maxForce = 150;
        const angle = Math.atan2(dy, dx);
        const force = Math.min(dist, maxForce);
        const speed = force * 0.13;
        
        grenadeVx = Math.cos(angle) * speed;
        grenadeVy = Math.sin(angle) * speed;
        
        grenadeBounces = 0;
        grenadeTrail = [];
        grenadeTimer = 0;
        
        playPinPullSound();
    }
}

function handleGrenadeTouchStart(e) {
    handleGrenadeMouseDown(e);
}
function handleGrenadeTouchMove(e) {
    handleGrenadeMouseMove(e);
}
function handleGrenadeTouchEnd(e) {
    handleGrenadeMouseUp(e);
}

function updateGrenadePhysics() {
    if (!grenadeActive) return;
    
    grenadeTimer++;
    if (grenadeTimer % 2 === 0) {
        grenadeTrail.push({ x: grenadeX, y: grenadeY });
        if (grenadeTrail.length > 50) grenadeTrail.shift();
    }
    
    grenadeVy += 0.22;
    grenadeVx *= 0.995;
    grenadeVy *= 0.995;
    
    grenadeX += grenadeVx;
    grenadeY += grenadeVy;
    
    const r = grenadeRadius;
    const w = grenadeCanvas.width;
    const h = grenadeCanvas.height;
    
    let hitBorder = false;
    if (grenadeX <= r) {
        grenadeX = r;
        grenadeVx = -grenadeVx * grenadeElasticity;
        hitBorder = true;
    } else if (grenadeX >= w - r) {
        grenadeX = w - r;
        grenadeVx = -grenadeVx * grenadeElasticity;
        hitBorder = true;
    }
    
    if (grenadeY <= r) {
        grenadeY = r;
        grenadeVy = -grenadeVy * grenadeElasticity;
        hitBorder = true;
    } else if (grenadeY >= h - r) {
        grenadeY = h - r;
        grenadeVy = -grenadeVy * grenadeElasticity;
        hitBorder = true;
    }
    
    if (hitBorder) {
        grenadeBounces++;
        playGrenadeBounceSound();
    }
    
    for (const obs of grenadeObstacles) {
        const closestX = Math.max(obs.x, Math.min(grenadeX, obs.x + obs.w));
        const closestY = Math.max(obs.y, Math.min(grenadeY, obs.y + obs.h));
        
        const distDx = grenadeX - closestX;
        const distDy = grenadeY - closestY;
        const distSq = distDx * distDx + distDy * distDy;
        
        if (distSq < r * r) {
            const overlapX = (obs.w / 2) + r - Math.abs(grenadeX - (obs.x + obs.w / 2));
            const overlapY = (obs.h / 2) + r - Math.abs(grenadeY - (obs.y + obs.h / 2));
            
            if (overlapX < overlapY) {
                grenadeVx = -grenadeVx * grenadeElasticity;
                grenadeX = (grenadeX > obs.x + obs.w / 2) ? obs.x + obs.w + r : obs.x - r;
            } else {
                grenadeVy = -grenadeVy * grenadeElasticity;
                grenadeY = (grenadeY > obs.y + obs.h / 2) ? obs.y + obs.h + r : obs.y - r;
            }
            
            grenadeBounces++;
            playGrenadeBounceSound();
            break;
        }
    }
    
    if (grenadeBounces >= 4 || grenadeTimer >= 150) {
        triggerGrenadeExplosion();
    }
}

function triggerGrenadeExplosion() {
    grenadeRoundTransitioning = true;
    grenadeActive = false;
    explosionActive = true;
    explosionX = grenadeX;
    explosionY = grenadeY;
    explosionRadius = 0;
    
    playGrenadeExplosionSound();
    
    explosionParticles = [];
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        explosionParticles.push({
            x: grenadeX,
            y: grenadeY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.04,
            color: `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
        });
    }
    
    const distToTarget = Math.hypot(grenadeX - grenadeTarget.x, grenadeY - grenadeTarget.y);
    const pixelToMeter = 0.15;
    const distInMeters = (distToTarget * pixelToMeter).toFixed(1);
    
    let points = 0;
    if (distToTarget < grenadeTarget.r) {
        points = Math.round(1000 * (1 - distToTarget / (grenadeTarget.r * 2)));
        points = Math.max(600, points);
    } else if (distToTarget < 85) {
        points = Math.round(500 * (1 - (distToTarget - grenadeTarget.r) / 85));
        points = Math.max(50, points);
    }
    
    grenadeScoreTotal += points;
    if (points > grenadeBestLaunchScore) {
        grenadeBestLaunchScore = points;
    }
    grenadeDistances.push(parseFloat(distInMeters));
    
    document.getElementById("grenadeLastDist").innerText = `${distInMeters} m`;
    document.getElementById("grenadeLiveScore").innerText = `${grenadeScoreTotal} pts`;
    
    setTimeout(() => {
        if (!grenadeGameRunning) return;
        
        if (grenadeLaunchCount >= 5) {
            stopGrenadeGame(true);
        } else {
            grenadeRoundTransitioning = false;
            grenadeLaunchCount++;
            document.getElementById("grenadeLaunchCount").innerText = `${grenadeLaunchCount} / 5`;
            generateGrenadeLayout(grenadeLaunchCount);
        }
    }, 1800);
}

function stopGrenadeGame(finished) {
    grenadeGameRunning = false;
    grenadeRoundTransitioning = false;
    grenadeActive = false;
    explosionActive = false;
    
    if (grenadeAnimFrameId) {
        cancelAnimationFrame(grenadeAnimFrameId);
        grenadeAnimFrameId = null;
    }
    
    if (grenadeCanvas) {
        grenadeCanvas.removeEventListener("mousedown", handleGrenadeMouseDown);
        window.removeEventListener("mousemove", handleGrenadeMouseMove);
        window.removeEventListener("mouseup", handleGrenadeMouseUp);
        grenadeCanvas.removeEventListener("touchstart", handleGrenadeTouchStart);
        window.removeEventListener("touchmove", handleGrenadeTouchMove);
        window.removeEventListener("touchend", handleGrenadeTouchEnd);
    }
    
    if (finished) {
        let sumDist = 0;
        grenadeDistances.forEach(d => sumDist += d);
        const avgDist = (grenadeDistances.length > 0 ? (sumDist / grenadeDistances.length) : 0).toFixed(1);
        
        document.getElementById("grenadeEndScore").innerText = `${grenadeScoreTotal} pts`;
        document.getElementById("grenadeBestLaunch").innerText = `${grenadeBestLaunchScore} pts`;
        document.getElementById("grenadeAvgDist").innerText = `${avgDist} m`;
        
        document.getElementById("grenadeTrainerPlayground").style.display = "none";
        document.getElementById("grenadeGameOver").style.display = "block";
        
        const oldScore = parseInt(localStorage.getItem("grenade_highscore") || "0");
        let isNewHighScore = false;
        if (grenadeScoreTotal > oldScore) {
            localStorage.setItem("grenade_highscore", grenadeScoreTotal);
            document.getElementById("grenadeGameHighScore").innerText = grenadeScoreTotal;
            isNewHighScore = true;
        }
        
        const flash = document.getElementById("newGrenadeHighScoreFlash");
        if (isNewHighScore) {
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
                    game_type: "grenade",
                    highscore: grenadeScoreTotal
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok" && data.updated) {
                    localStorage.setItem("grenade_highscore", data.highscore);
                    document.getElementById("grenadeGameHighScore").innerText = data.highscore;
                    flash.style.display = "block";
                }
            })
            .catch(err => console.error("Erro ao salvar recorde no banco:", err));
        }
    }
}

function drawGrenadePreview() {
    if (!grenadeDragging) return;
    
    const dx = grenadeDragStart.x - grenadeDragCurrent.x;
    const dy = grenadeDragStart.y - grenadeDragCurrent.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 15) return;
    
    const maxForce = 150;
    const angle = Math.atan2(dy, dx);
    const force = Math.min(dist, maxForce);
    const speed = force * 0.13;
    
    let tempVx = Math.cos(angle) * speed;
    let tempVy = Math.sin(angle) * speed;
    
    let tempX = grenadeLaunchOrigin.x;
    let tempY = grenadeLaunchOrigin.y;
    
    grenadeCtx.save();
    grenadeCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    grenadeCtx.lineWidth = 2;
    grenadeCtx.setLineDash([4, 6]);
    grenadeCtx.beginPath();
    grenadeCtx.moveTo(tempX, tempY);
    
    for (let step = 0; step < 60; step++) {
        tempVy += 0.22;
        tempVx *= 0.995;
        tempVy *= 0.995;
        
        tempX += tempVx;
        tempY += tempVy;
        
        if (tempX < 0 || tempX > grenadeCanvas.width || tempY < 0 || tempY > grenadeCanvas.height) {
            grenadeCtx.lineTo(tempX, tempY);
            break;
        }
        
        let hitObstacle = false;
        for (const obs of grenadeObstacles) {
            if (tempX >= obs.x && tempX <= obs.x + obs.w && tempY >= obs.y && tempY <= obs.y + obs.h) {
                hitObstacle = true;
                break;
            }
        }
        if (hitObstacle) {
            grenadeCtx.lineTo(tempX, tempY);
            break;
        }
        
        grenadeCtx.lineTo(tempX, tempY);
    }
    grenadeCtx.stroke();
    grenadeCtx.restore();
    
    grenadeCtx.save();
    grenadeCtx.strokeStyle = "rgba(255, 85, 0, 0.5)";
    grenadeCtx.lineWidth = 3;
    grenadeCtx.beginPath();
    grenadeCtx.moveTo(grenadeLaunchOrigin.x, grenadeLaunchOrigin.y);
    grenadeCtx.lineTo(grenadeLaunchOrigin.x - Math.cos(angle) * force * 0.5, grenadeLaunchOrigin.y - Math.sin(angle) * force * 0.5);
    grenadeCtx.stroke();
    
    grenadeCtx.fillStyle = "#ffaa00";
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeLaunchOrigin.x - Math.cos(angle) * force * 0.5, grenadeLaunchOrigin.y - Math.sin(angle) * force * 0.5, 6, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.restore();
}

function grenadeGameLoop() {
    if (!grenadeGameRunning) return;
    
    updateGrenadePhysics();
    
    grenadeCtx.clearRect(0, 0, grenadeCanvas.width, grenadeCanvas.height);
    
    grenadeCtx.save();
    const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.005);
    grenadeCtx.strokeStyle = "rgba(0, 255, 153, 0.15)";
    grenadeCtx.lineWidth = 3;
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeTarget.x, grenadeTarget.y, grenadeTarget.r * 2 * pulse, 0, Math.PI * 2);
    grenadeCtx.stroke();
    
    grenadeCtx.strokeStyle = "rgba(0, 255, 153, 0.5)";
    grenadeCtx.fillStyle = "rgba(0, 255, 153, 0.08)";
    grenadeCtx.lineWidth = 2;
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeTarget.x, grenadeTarget.y, grenadeTarget.r, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.stroke();
    
    grenadeCtx.fillStyle = "#00ff99";
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeTarget.x, grenadeTarget.y, 4, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.restore();
    
    grenadeCtx.save();
    grenadeCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
    grenadeCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    grenadeCtx.lineWidth = 2;
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeLaunchOrigin.x, grenadeLaunchOrigin.y, 14, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.stroke();
    grenadeCtx.restore();
    
    grenadeObstacles.forEach(obs => {
        grenadeCtx.save();
        grenadeCtx.fillStyle = "#1e293b";
        grenadeCtx.fillRect(obs.x + 3, obs.y + 3, obs.w, obs.h);
        
        grenadeCtx.fillStyle = "#0f172a";
        grenadeCtx.strokeStyle = "#a855f7";
        grenadeCtx.lineWidth = 2;
        grenadeCtx.fillRect(obs.x, obs.y, obs.w, obs.h);
        grenadeCtx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        
        grenadeCtx.strokeStyle = "rgba(168, 85, 247, 0.2)";
        grenadeCtx.beginPath();
        grenadeCtx.moveTo(obs.x, obs.y);
        grenadeCtx.lineTo(obs.x + obs.w, obs.y + obs.h);
        grenadeCtx.moveTo(obs.x + obs.w, obs.y);
        grenadeCtx.lineTo(obs.x, obs.y + obs.h);
        grenadeCtx.stroke();
        grenadeCtx.restore();
    });
    
    drawGrenadePreview();
    
    if (grenadeActive && grenadeTrail.length > 1) {
        grenadeCtx.save();
        grenadeCtx.strokeStyle = "rgba(255, 85, 0, 0.35)";
        grenadeCtx.lineWidth = 3;
        grenadeCtx.lineCap = "round";
        grenadeCtx.beginPath();
        grenadeCtx.moveTo(grenadeTrail[0].x, grenadeTrail[0].y);
        for (let i = 1; i < grenadeTrail.length; i++) {
            grenadeCtx.lineTo(grenadeTrail[i].x, grenadeTrail[i].y);
        }
        grenadeCtx.stroke();
        grenadeCtx.restore();
    }
    
    if (grenadeActive) {
        grenadeCtx.save();
        grenadeCtx.fillStyle = "rgba(0,0,0,0.5)";
        grenadeCtx.beginPath();
        grenadeCtx.arc(grenadeX + 2, grenadeY + 2, grenadeRadius, 0, Math.PI * 2);
        grenadeCtx.fill();
        
        grenadeCtx.fillStyle = "#334155";
        grenadeCtx.strokeStyle = "#1e293b";
        grenadeCtx.lineWidth = 1;
        grenadeCtx.beginPath();
        grenadeCtx.arc(grenadeX, grenadeY, grenadeRadius, 0, Math.PI * 2);
        grenadeCtx.fill();
        grenadeCtx.stroke();
        
        const glowPulse = Math.abs(Math.sin(Date.now() * 0.02));
        grenadeCtx.fillStyle = `rgba(255, 0, 0, ${0.4 + glowPulse * 0.6})`;
        grenadeCtx.beginPath();
        grenadeCtx.arc(grenadeX, grenadeY - 2, 2, 0, Math.PI * 2);
        grenadeCtx.fill();
        grenadeCtx.restore();
    }
    
    if (explosionActive) {
        explosionRadius += 3;
        if (explosionRadius > explosionMaxRadius) {
            explosionActive = false;
        } else {
            grenadeCtx.save();
            const grad = grenadeCtx.createRadialGradient(explosionX, explosionY, 2, explosionX, explosionY, explosionRadius);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            grad.addColorStop(0.3, "rgba(255, 170, 0, 0.8)");
            grad.addColorStop(0.7, "rgba(255, 68, 0, 0.5)");
            grad.addColorStop(1, "rgba(255, 0, 0, 0)");
            
            grenadeCtx.fillStyle = grad;
            grenadeCtx.beginPath();
            grenadeCtx.arc(explosionX, explosionY, explosionRadius, 0, Math.PI * 2);
            grenadeCtx.fill();
            
            explosionParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.life -= p.decay;
                
                if (p.life > 0) {
                    grenadeCtx.fillStyle = p.color;
                    grenadeCtx.globalAlpha = p.life;
                    grenadeCtx.beginPath();
                    grenadeCtx.arc(p.x, p.y, 2 + p.life * 3, 0, Math.PI * 2);
                    grenadeCtx.fill();
                }
            });
            grenadeCtx.restore();
        }
    }
    
    grenadeAnimFrameId = requestAnimationFrame(grenadeGameLoop);
}

