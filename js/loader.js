// ─── Dynamic Template & Script Loader ──────────────────────────────────────────

(async function() {
    try {
        // 1. Fetch and inject HTML partials/templates
        const templates = [
            'templates/modals/modal_account.html',
            'templates/modals/modal_crop.html',
            'templates/panels/panel_kill_ranking.html',
            'templates/panels/panel_history.html',
            'templates/modals/modal_vote.html',
            'templates/modals/modal_custom_weapons.html',
            'templates/modals/modal_profile.html',
            'templates/modals/modal_admin.html',
            'templates/modals/modal_history.html',
            'templates/minigames/minigames_modal.html',
            'templates/panels/panel_live_players.html'
        ];

        const modalsContainer = document.getElementById("modalsContainer");
        const panelsContainer = document.getElementById("panelsContainer");

        for (const url of templates) {
            const response = await fetch(url + `?v=${Date.now()}`);
            if (!response.ok) {
                console.error(`Erro ao carregar template: ${url}`);
                continue;
            }
            const html = await response.text();
            
            // Append to appropriate container or directly to body
            if (url.includes('modal')) {
                modalsContainer.insertAdjacentHTML('beforeend', html);
            } else {
                panelsContainer.insertAdjacentHTML('beforeend', html);
            }
        }

        // 2. Load all JS modules in sequential order
        const scripts = [
            'js/config.js',
            'js/utils.js',
            'js/votes.js',
            'js/dashboard.js',
            'js/server.js',
            'js/ranking.js',
            'js/history.js',
            'js/profile.js',
            'js/auth.js',
            'js/avatar.js',
            'js/minigames/minigames.js',
            'js/minigames/aim_trainer.js',
            'js/minigames/reaction_trainer.js',
            'js/minigames/spray_trainer.js',
            'js/minigames/fof_trainer.js',
            'js/minigames/grenade_trainer.js',
            'js/minigames/termo_trainer.js',
            'js/minigames/bomb_trainer.js'
        ];

        for (const src of scripts) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src + `?v=${Date.now()}`;
                s.onload = resolve;
                s.onerror = (err) => {
                    console.error(`Erro ao carregar script: ${src}`, err);
                    reject(err);
                };
                document.body.appendChild(s);
            });
        }

        // 3. Post-load initialization
        // Daily votes reset
        if (typeof resetDailyVotes === 'function') resetDailyVotes();

        // Bind global controls and load initial data
        if (typeof setupWeaponButtons === 'function') setupWeaponButtons();
        if (typeof setupFriendlyFireButtons === 'function') setupFriendlyFireButtons();
        if (typeof setupAdminControls === 'function') setupAdminControls();
        
        // Initial fetch/rendering
        if (typeof fetchVotes === 'function') await fetchVotes();
        
        // Check session and load user profile
        if (typeof checkSession === 'function') checkSession();

        // Update server live status periodically
        if (typeof updateServerStatus === 'function') {
            await updateServerStatus();
            setInterval(updateServerStatus, 5000);
        }

        // Load side panels initial content
        if (typeof fetchKills === 'function') fetchKills("daily");
        if (typeof fetchHistory === 'function') fetchHistory();
        if (typeof loadTop3Ranking === 'function') loadTop3Ranking();

        // Global Modal Close Logic
        document.querySelectorAll(".close").forEach(c => {
            c.onclick = function() {
                const modal = this.closest(".modal");
                if (modal) modal.style.display = "none";
            }
        });

        let mousedownTarget = null;
        window.addEventListener('mousedown', function(event) {
            mousedownTarget = event.target;
        });

        window.onclick = function(event) {
            if (event.target.classList.contains("modal") && mousedownTarget === event.target) {
                event.target.style.display = "none";
            }
        }

        console.log("UrbanVote: Módulos e templates carregados com sucesso!");

    } catch (error) {
        console.error("Erro crítico na inicialização do UrbanVote:", error);
    }
})();
