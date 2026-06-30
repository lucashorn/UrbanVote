// ─── Profile & Comparison Module ──────────────────────────────────────────────

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
    if (selectEl) {
        if ($(selectEl).hasClass("select2-hidden-accessible")) {
            $(selectEl).val(null).trigger("change");
        } else {
            selectEl.value = "";
        }
    }
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
                if ($(selectEl).hasClass("select2-hidden-accessible")) {
                    $(selectEl).select2("destroy");
                }
                selectEl.innerHTML = '<option value=""></option>';
                
                try {
                    const res = await fetch(`${API_URL}/players-all`);
                    const players = await res.json();
                    
                    const currentPlayer = activeProfileData ? activeProfileData.player : "";
                    players.forEach(p => {
                        if (!p.display || p.display === currentPlayer) return;
                        const opt = document.createElement("option");
                        opt.value = p.display;
                        opt.dataset.hasKills = p.has_kills ? "1" : "0";
                        opt.dataset.hasMinigame = p.has_minigame ? "1" : "0";
                        opt.dataset.linked = p.linked ? "1" : "0";
                        opt.dataset.avatar = p.avatar || "";
                        opt.innerText = p.display;
                        selectEl.appendChild(opt);
                    });
                } catch (e) {
                    console.error("Erro ao carregar jogadores", e);
                }
                
                $(selectEl).select2({
                    placeholder: "Buscar jogador...",
                    allowClear: true,
                    width: "280px",
                    dropdownParent: document.getElementById("compareSelectorContainer"),
                    templateResult: (data) => {
                        if (!data.id) return data.text;
                        const el = data.element;
                        const hasKills    = el && el.dataset.hasKills    === "1";
                        const hasMinigame = el && el.dataset.hasMinigame === "1";
                        const linked      = el && el.dataset.linked      === "1";
                        const avatar      = el ? (el.dataset.avatar || "") : "";
                        
                        const img = avatar
                            ? `<img src="${avatar}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;">`
                            : `<i class="fas fa-user-circle" style="margin-right:6px;color:#8b949e;"></i>`;
                        const killIcon     = hasKills    ? `<i class="fas fa-skull" title="Tem kills no jogo" style="margin-left:4px;color:#ff4d4d;font-size:0.75em;"></i>` : "";
                        const minigameIcon = hasMinigame ? `<i class="fas fa-gamepad" title="Tem records em minigames" style="margin-left:4px;color:#a855f7;font-size:0.75em;"></i>` : "";
                        const siteTag      = !linked     ? `<span style="font-size:0.7em;color:#666;margin-left:6px;">[site]</span>` : "";
                        
                        const $el = $(`<span>${img}${data.text}${killIcon}${minigameIcon}${siteTag}</span>`);
                        return $el;
                    },
                    templateSelection: (data) => data.text || "Buscar jogador..."
                });
                
                $(selectEl).select2("open");
                
                $(selectEl).off("change.compare").on("change.compare", async () => {
                    const opponent = $(selectEl).val();
                    if (!opponent) {
                        const compLayout = document.getElementById("profileComparisonLayout");
                        const normalLayout = document.querySelector(".profile-body-layout");
                        if (compLayout) compLayout.style.display = "none";
                        if (normalLayout) normalLayout.style.display = "flex";
                        return;
                    }
                    
                    Swal.fire({ title: "Carregando comparação...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    try {
                        const normalLayout = document.querySelector(".profile-body-layout");
                        if (normalLayout) normalLayout.style.display = "none";
                        
                        const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(opponent)}`);
                        const opponentData = await res.json();
                        
                        Swal.close();
                        if (activeProfileData) {
                            renderComparison(activeProfileData, opponentData);
                        }
                    } catch (e) {
                        Swal.close();
                        showToast("error", "Erro ao buscar oponente.");
                        console.error("Erro ao buscar oponente", e);
                    }
                });
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
            
            Swal.fire({ title: "Carregando comparação...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const normalLayout = document.querySelector(".profile-body-layout");
                if (normalLayout) normalLayout.style.display = "none";
                
                const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(myIdentifier)}`);
                const opponentData = await res.json();
                
                if (!auth.player_name) {
                    const aimScores = JSON.parse(localStorage.getItem("aim_trainer_highscores") || "{}");
                    const localAim = Math.max(0, ...Object.values(aimScores).map(Number));
                    const localReaction = parseInt(localStorage.getItem("reaction_highscore") || "0");
                    const localSpray   = parseInt(localStorage.getItem("spray_highscore")    || "0");
                    const localFof     = parseInt(localStorage.getItem("fof_highscore")      || "0");
                    const localGrenade = parseInt(localStorage.getItem("grenade_highscore")  || "0");
                    if (localAim     > (opponentData.aimHighscore     || 0)) opponentData.aimHighscore     = localAim;
                    if (localReaction > (opponentData.reactionHighscore || 0)) opponentData.reactionHighscore = localReaction;
                    if (localSpray   > (opponentData.sprayHighscore   || 0)) opponentData.sprayHighscore   = localSpray;
                    if (localFof     > (opponentData.fofHighscore     || 0)) opponentData.fofHighscore     = localFof;
                    if (localGrenade > (opponentData.grenadeHighscore || 0)) opponentData.grenadeHighscore = localGrenade;
                }
                
                Swal.close();
                if (activeProfileData) {
                    renderComparison(activeProfileData, opponentData);
                }
            } catch (e) {
                Swal.close();
                showToast("error", "Erro ao comparar comigo.");
                console.error("Erro ao comparar comigo", e);
            }
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            resetComparisonMode();
        };
    }
}

async function openProfile(playerName) {
    const modal = document.getElementById("profileModal");
    modal.style.display = "flex";
    document.getElementById("profileName").innerText = playerName;

    resetComparisonMode();
    const compareBtn = document.getElementById("profileCompareBtn");
    if (compareBtn) compareBtn.disabled = true;

    document.getElementById("profileAvatarIcon").style.display = "block";
    document.getElementById("profileAvatarImg").style.display = "none";

    const achContainer = document.getElementById("profileAchievements");
    if (achContainer) {
        achContainer.innerHTML = "";
    }

    Swal.fire({ title: "Carregando perfil...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/profile?player=${encodeURIComponent(playerName)}`);
        const data = await res.json();
        activeProfileData = data;
        Swal.close();

        const avatarImg = document.getElementById("profileAvatarImg");
        const avatarIcon = document.getElementById("profileAvatarIcon");
        if (avatarImg) {
            avatarImg.src = data.avatar || "img/default_avatar.png";
            avatarImg.dataset.original = data.avatar_original || data.avatar || "img/default_avatar.png";
            avatarImg.style.display = "block";
        }
        if (avatarIcon) {
            avatarIcon.style.display = "none";
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

            if (randomFile === "dance.svg") {
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
                    clip1d.setAttribute("height", (h + 2.4).toString());
                }
                const clip5d = svgElement.querySelector("#clip5_68_32 rect");
                if (clip5d) {
                    const h = parseFloat(clip5d.getAttribute("height") || "278");
                    clip5d.setAttribute("height", (h + 1.2).toString());
                }
            }

            if (randomFile === "espacate.svg") {
                const clip1e = svgElement.querySelector("#clip1_73_25 rect");
                if (clip1e) {
                    const h = parseFloat(clip1e.getAttribute("height") || "466");
                    clip1e.setAttribute("height", (h + 1.5).toString());
                }
                const clip2e = svgElement.querySelector("#clip2_73_25 rect");
                if (clip2e) {
                    const h = parseFloat(clip2e.getAttribute("height") || "206");
                    clip2e.setAttribute("height", (h + 1.5).toString());
                }
                const clip3e = svgElement.querySelector("#clip3_73_25 rect");
                if (clip3e) {
                    const h = parseFloat(clip3e.getAttribute("height") || "172");
                    clip3e.setAttribute("height", (h + 1.5).toString());
                }
                const clip4e = svgElement.querySelector("#clip4_73_25 rect");
                if (clip4e) {
                    const w = parseFloat(clip4e.getAttribute("width") || "158");
                    const h = parseFloat(clip4e.getAttribute("height") || "516");
                    clip4e.setAttribute("width", (w + 1.5).toString());
                    clip4e.setAttribute("height", (h + 1.5).toString());
                }
            }

            if (randomFile === "ashtasharan.svg") {
                const clip1e = svgElement.querySelector("#clip1_73_49 rect");
                if (clip1e) {
                    const h = parseFloat(clip1e.getAttribute("height") || "595");
                    clip1e.setAttribute("height", (h + 1.5).toString());
                }
                const clip4e = svgElement.querySelector("#clip4_73_49 rect");
                if (clip4e) {
                    const h = parseFloat(clip4e.getAttribute("height") || "258");
                    clip4e.setAttribute("height", (h + 1.5).toString());
                }
                const clip2e = svgElement.querySelector("#clip2_73_49 rect");
                if (clip2e) {
                    const w = parseFloat(clip2e.getAttribute("width") || "322");
                    clip2e.setAttribute("width", (w + 1.5).toString());
                }
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

            if (randomFile === "hamster.svg") {
                svgElement.querySelectorAll("clipPath rect").forEach(rect => {
                    const w = parseFloat(rect.getAttribute("width") || "0");
                    const h = parseFloat(rect.getAttribute("height") || "0");
                    if (w > 0 && h > 0) {
                        rect.setAttribute("width", (w + 2.0).toString());
                        rect.setAttribute("height", (h + 2.0).toString());
                    }
                });

                const torsoClips = ["clip5_73_131", "clip4_73_131", "clip3_73_131", "clip2_73_131"];
                torsoClips.forEach(id => {
                    const rect = svgElement.querySelector(`#${id} rect`);
                    if (rect) {
                        const h = parseFloat(rect.getAttribute("height") || "0");
                        rect.setAttribute("height", (h + 15.0).toString());
                    }
                });

                const leftArmClips = ["clip10_73_131", "clip11_73_131", "clip12_73_131"];
                leftArmClips.forEach(id => {
                    const rect = svgElement.querySelector(`#${id} rect`);
                    if (rect) {
                        const w = parseFloat(rect.getAttribute("width") || "0");
                        rect.setAttribute("width", (w + 15.0).toString());
                    }
                });

                const rightArmClips = ["clip8_73_131", "clip9_73_131"];
                rightArmClips.forEach(id => {
                    const rect = svgElement.querySelector(`#${id} rect`);
                    if (rect) {
                        const w = parseFloat(rect.getAttribute("width") || "0");
                        rect.setAttribute("width", (w + 15.0).toString());
                    }
                });
            }

            const bodyGroups = Array.from(svgElement.children).filter(child => child.tagName.toLowerCase() === "g" && child.hasAttribute("clip-path"));

            const bgGroupWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
            bgGroupWrapper.id = "heatmap-bg-layer";
            bodyGroups.forEach(g => {
                const clone = g.cloneNode(true);
                clone.querySelectorAll("path").forEach(p => p.setAttribute("fill", "#181a1f"));
                bgGroupWrapper.appendChild(clone);
            });

            const heatGroupWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
            heatGroupWrapper.id = "heatmap-glow-layer";

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

            const outlineGroupWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
            outlineGroupWrapper.id = "heatmap-outline-layer";
            outlineGroupWrapper.setAttribute("style", "pointer-events: none;");

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

            bodyGroups.forEach(g => {
                const clipPathAttr = g.getAttribute("clip-path");
                if (clipPathAttr) {
                    const match = clipPathAttr.match(/#([^)]+)/);
                    if (match) {
                        const clipId = match[1];
                        const zoneName = config.clipZones[clipId];
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

            bodyGroups.forEach(g => svgElement.removeChild(g));
            svgElement.appendChild(bgGroupWrapper);
            svgElement.appendChild(heatGroupWrapper);
            svgElement.appendChild(outlineGroupWrapper);

            svgElement.classList.add("body-heatmap-svg");

            const bodyContainer = document.querySelector(".body-heatmap-inner");
            bodyContainer.innerHTML = svgElement.outerHTML;

        } catch (err) {
            console.error("Erro ao carregar SVG anatômico", err);
        }

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
        Swal.close();
        console.error(e);
        document.getElementById("profileName").innerText = "Erro ao carregar";
    }
}

function renderBodyHeatmap(hitLocations, totalHits) {
    const emptyEl = document.getElementById("bodyHeatmapEmpty");
    const legendEl = document.getElementById("bodyHeatmapLegend");
    const tooltip = document.getElementById("bodyHeatmapTooltip");

    legendEl.innerHTML = "";

    if (!hitLocations || totalHits === 0) {
        emptyEl.style.display = "block";
        document.querySelectorAll(`.body-heatmap-svg [data-zone]`).forEach(el => {
            el.querySelectorAll("path").forEach(p => p.setAttribute("fill", "transparent"));
            el.style.opacity = "0";
        });
        return;
    }
    emptyEl.style.display = "none";

    const baseColor = "#ff3b30";
    const maxPct = Math.max(...Object.keys(ZONE_META).map(z => (hitLocations[z] || { pct: 0 }).pct || 0));

    Object.entries(ZONE_META).forEach(([zone, meta]) => {
        const info = hitLocations[zone] || { count: 0, pct: 0 };
        const pct = info.pct || 0;
        const count = info.count || 0;

        const t = maxPct > 0 ? pct / maxPct : 0;
        const opacity = pct > 0 ? (0.2 + 0.65 * t) : 0;
        const color = baseColor;
        const legendColor = pct > 0 ? baseColor : "#2a2a2a";

        const barWidth = maxPct > 0 ? Math.round((pct / maxPct) * 100) : 0;

        const zoneEls = document.querySelectorAll(`[data-zone="${zone}"]`);
        zoneEls.forEach(zoneEl => {
            zoneEl.querySelectorAll("path").forEach(p => {
                p.setAttribute("fill", color);
                p.setAttribute("pointer-events", "all");
            });
            zoneEl.style.opacity = opacity.toString();
            zoneEl.style.cursor = "pointer";

            zoneEl.onmouseenter = (e) => {
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
            zoneEl.onmousemove = (e) => {
                tooltip.style.left = (e.clientX + 14) + "px";
                tooltip.style.top = (e.clientY - 10) + "px";
            };
            zoneEl.onmouseleave = () => {
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
        });

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

// Initialize comparison events
initCompareEvents();

window.openProfile = openProfile;
window.resetComparisonMode = resetComparisonMode;
