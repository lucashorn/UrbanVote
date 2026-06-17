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

// --- Profile Modal ---
async function openProfile(playerName) {
    const modal = document.getElementById("profileModal");
    modal.style.display = "flex";
    document.getElementById("profileName").innerText = playerName;

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
        // Render body heatmap
        renderBodyHeatmap(data.hitLocations || null, data.totalHits || 0);

    } catch (e) {
        console.error(e);
        document.getElementById("profileName").innerText = "Erro ao carregar";
    }
}

// ---- Body Heatmap ----
const ZONE_META = {
    head:  { label: "Cabeça", color: "#ff2222" },
    torso: { label: "Tronco", color: "#ff7700" },
    arms:  { label: "Braços", color: "#ffcc00" },
    legs:  { label: "Pernas", color: "#22dd88" }
};

function heatColor(pct, maxPct) {
    // Intensity: relative to the max zone — most-hit = brightest red
    const t = maxPct > 0 ? pct / maxPct : 0;
    // dark #1a1a1a (0%) → vivid red #ff2222 (100%)
    const r = Math.round(26 + (255 - 26) * t);
    const g = Math.round(26 + (34 - 26) * t);
    const b = Math.round(26 + (34 - 26) * t);
    return `rgb(${r},${g},${b})`;
}

function dimColor(pct, maxPct) {
    const t = maxPct > 0 ? pct / maxPct : 0;
    const r = Math.round(15 + (120 - 15) * t);
    const g = Math.round(15 + (10 - 15) * t);
    const b = Math.round(15 + (10 - 15) * t);
    return `rgb(${r},${g},${b})`;
}

function renderBodyHeatmap(hitLocations, totalHits) {
    const emptyEl = document.getElementById("bodyHeatmapEmpty");
    const legendEl = document.getElementById("bodyHeatmapLegend");
    const tooltip = document.getElementById("bodyHeatmapTooltip");

    legendEl.innerHTML = "";

    if (!hitLocations || totalHits === 0) {
        emptyEl.style.display = "block";
        // Reset all zones to dark default
        ["head", "torso", "arms", "legs"].forEach(zone => {
            const inner = document.getElementById(`zoneGradStop-${zone}-inner`);
            const outer = document.getElementById(`zoneGradStop-${zone}-outer`);
            if (inner) inner.setAttribute("stop-color", "#2a2a2a");
            if (outer) outer.setAttribute("stop-color", "#111");
        });
        return;
    }
    emptyEl.style.display = "none";

    // Find max pct for relative intensity scaling
    const maxPct = Math.max(...Object.keys(ZONE_META).map(z => (hitLocations[z] || {pct:0}).pct || 0));

    Object.entries(ZONE_META).forEach(([zone, meta]) => {
        const info = hitLocations[zone] || { count: 0, pct: 0 };
        const pct = info.pct || 0;
        const count = info.count || 0;
        const color = heatColor(pct, maxPct);
        const dim   = dimColor(pct, maxPct);
        // Bar width relative to max zone (so top zone = 100% width)
        const barWidth = maxPct > 0 ? Math.round((pct / maxPct) * 100) : 0;

        // Color SVG gradient stops
        const inner = document.getElementById(`zoneGradStop-${zone}-inner`);
        const outer = document.getElementById(`zoneGradStop-${zone}-outer`);
        if (inner) inner.setAttribute("stop-color", color);
        if (outer) outer.setAttribute("stop-color", dim);

        // Tooltip on hover
        const zoneEl = document.getElementById(`zone-${zone}`);
        if (zoneEl) {
            zoneEl.onmouseenter = (e) => {
                tooltip.innerHTML = `<strong>${meta.label}</strong>${count} acertos &bull; ${pct}%`;
                tooltip.style.display = "block";
            };
            zoneEl.onmousemove = (e) => {
                tooltip.style.left = (e.clientX + 14) + "px";
                tooltip.style.top  = (e.clientY - 10) + "px";
            };
            zoneEl.onmouseleave = () => {
                tooltip.style.display = "none";
            };
        }

        // Legend row
        const row = document.createElement("div");
        row.className = "heatmap-legend-row";
        row.innerHTML = `
            <span class="heatmap-legend-dot" style="background:${color};box-shadow:0 0 4px ${color};"></span>
            <span class="heatmap-legend-label">${meta.label}</span>
            <div class="heatmap-legend-bar-wrap">
                <div class="heatmap-legend-bar" style="width:0%;background:${color};" data-target="${barWidth}"></div>
            </div>
            <span class="heatmap-legend-pct">${pct}%</span>
        `;
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
