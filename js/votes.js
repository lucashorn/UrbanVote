// ─── Votes Module ─────────────────────────────────────────────────────────────

let votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let selectedMap = null;
let selectedMode = "4";
let selectedWeapon = "Todas as armas";
let selectedFriendlyFire = "0";
let selectedCustomWeapons = [];
let previousWeapon = "Todas as armas";
let defaultTimelimit = 5;
let defaultFraglimit = 10;

function hasAlreadyVotedForMap(map) {
    return votes.some(v =>
        v.map === map &&
        v.date === getToday() &&
        v.browserId === browserId
    );
}

function resetDailyVotes() {
    const savedDate = localStorage.getItem(DATE_KEY);
    if (savedDate !== getToday()) {
        votes = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        localStorage.setItem(DATE_KEY, getToday());
    }
}

function getGear(weapon, customWeaponsArray = []) {
    if (weapon === "Todas as armas") return "0";

    let allowed = [];
    if (weapon === "Somente Sniper") {
        allowed = Object.keys(customWeaponGroups["Snipers"]);
    } else if (weapon === "Somente Pistola") {
        allowed = Object.keys(customWeaponGroups["Pistolas"]);
    } else if (weapon === "Somente Granada") {
        allowed = ["K", "O", "Q"];
    } else if (weapon === "Personalizadas") {
        allowed = customWeaponsArray;
    }

    let gearStr = "";
    OFFICIAL_GEAR_ORDER.split("").forEach(letter => {
        if (!allowed.includes(letter)) gearStr += letter;
    });
    return gearStr || "0";
}

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

function setupWeaponButtons() {
    document.querySelectorAll(".weapon-btn").forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.weapon !== "Personalizadas") {
                previousWeapon = btn.dataset.weapon;
            }
            document.querySelectorAll(".weapon-btn").forEach(b => b.classList.remove("active"));
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
            document.querySelectorAll(".ff-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedFriendlyFire = btn.dataset.ff;
        };
    });
}

function renderModeButtons() {
    const container = document.getElementById("modeButtons");
    container.innerHTML = "";

    Object.entries(modeNames).forEach(([value, label]) => {
        const btn = document.createElement("button");
        btn.className = "mode-btn";
        btn.innerText = label;

        if (value === selectedMode) btn.classList.add("active");

        btn.onclick = () => {
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
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

    weaponLabel.style.opacity = "1";
    weaponGrid.style.pointerEvents = "auto";
    weaponGrid.style.opacity = "1";
    ffLabel.style.opacity = "1";
    ffGrid.style.pointerEvents = "auto";
    ffGrid.style.opacity = "1";
    fraglimitInput.disabled = false;
    fraglimitInput.style.opacity = "1";
    fraglimitInput.parentElement.style.opacity = "1";

    if (isGunGame) {
        selectedWeapon = "Todas as armas";
        document.querySelectorAll(".weapon-btn").forEach(b => {
            b.dataset.weapon === "Todas as armas" ? b.classList.add("active") : b.classList.remove("active");
        });
        weaponLabel.style.opacity = "0.4";
        weaponGrid.style.pointerEvents = "none";
        weaponGrid.style.opacity = "0.4";

        selectedFriendlyFire = "0";
        document.querySelectorAll(".ff-btn").forEach(b => {
            b.dataset.ff === "0" ? b.classList.add("active") : b.classList.remove("active");
        });
        ffLabel.style.opacity = "0.4";
        ffGrid.style.pointerEvents = "none";
        ffGrid.style.opacity = "0.4";

        fraglimitInput.value = "";
        fraglimitInput.disabled = true;
        fraglimitInput.style.opacity = "0.4";
        fraglimitInput.parentElement.style.opacity = "0.4";
    } else if (isLmsOrFfa) {
        selectedFriendlyFire = "0";
        document.querySelectorAll(".ff-btn").forEach(b => {
            b.dataset.ff === "0" ? b.classList.add("active") : b.classList.remove("active");
        });
        ffLabel.style.opacity = "0.4";
        ffGrid.style.pointerEvents = "none";
        ffGrid.style.opacity = "0.4";
    }
}

function openVoteModal(map) {
    if (hasAlreadyVotedForMap(map)) {
        showToast("warning", "Você já votou neste mapa hoje.");
        return;
    }

    selectedMap = map;
    selectedMode = "4";
    selectedWeapon = "Todas as armas";
    selectedFriendlyFire = "0";

    document.getElementById("modeInfoPanel").style.display = "none";
    document.getElementById("modalMapName").innerText = map;

    renderModeButtons();

    document.querySelectorAll(".weapon-btn").forEach(b => b.classList.remove("active"));
    document.querySelector('[data-weapon="Todas as armas"]').classList.add("active");

    document.querySelectorAll(".ff-btn").forEach(b => b.classList.remove("active"));
    document.querySelector('[data-ff="0"]').classList.add("active");

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
        headers: { "Content-Type": "application/json" },
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
        showToast("error", await response.text());
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

window.setupWeaponButtons = setupWeaponButtons;
window.setupFriendlyFireButtons = setupFriendlyFireButtons;
window.resetDailyVotes = resetDailyVotes;
window.fetchVotes = fetchVotes;
window.openWeaponZoom = openWeaponZoom;
window.closeWeaponZoom = closeWeaponZoom;
window.openAvatarZoom = openAvatarZoom;
window.closeAvatarZoom = closeAvatarZoom;
window.confirmVote = confirmVote;
window.openVoteModal = openVoteModal;
window.openCustomWeaponsModal = openCustomWeaponsModal;
window.closeCustomWeaponsModal = closeCustomWeaponsModal;
window.selectAllWeapons = selectAllWeapons;
window.unselectAllWeapons = unselectAllWeapons;
