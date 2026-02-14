(function () {
            "use strict";

            const canvas = document.getElementById("game-canvas");
            const game = new Game();
            const renderer = new Renderer(canvas, game);
            const editor = new Editor();
            // Expose editor instance globally so the Export JSON button can access it
            window.editor = editor;

            const params = new URLSearchParams(window.location.search);
            const COMMUNITY_ENABLED = (window.COMMUNITY_ENABLED ?? false) || params.get("community") === "true";
            const COMMUNITY_API_BASE = window.COMMUNITY_API_BASE || "";
            const api = (COMMUNITY_ENABLED && window.HexTaticsAPI && COMMUNITY_API_BASE)
                ? new window.HexTaticsAPI(COMMUNITY_API_BASE)
                : null;

            let currentLevelIndex = 0;
            let statusTimeout = null;
            let isCustomLevel = false;
            let isTutorialLevel = false;

            // Timer
            let levelStartTime = 0, levelElapsed = 0, timerInterval = null, pausedAtTime = 0, totalPausedMs = 0;

            // Tutorial Wizard
            let tutorialActive = false;
            let tutorialPhases = [];
            let tutorialPhaseIndex = 0;
            let tutorialActionIndex = 0;
            let tutorialPhaseCompleted = false;

            // Confetti
            const confettiCanvas = document.getElementById("confetti-canvas");
            const confettiCtx = confettiCanvas.getContext("2d");
            let confettiPieces = [], confettiRunning = false;
            let confettiStopTimer = null;

            // Editor hover
            let editorHoveredCell = null;

            // Community
            let communityTab = "recent";
            let communityCursor = null;
            let communityLoading = false;
            let currentFeedMaps = [];
            let pendingReportMapId = null;
            let pendingPublishLevel = null;
            let currentCommunityMapMeta = null;

            // ===================== INIT =====================
            function init() {
                if (!COMMUNITY_ENABLED) {
                    const mapsBtn = document.getElementById("btn-maps");
                    if (mapsBtn) mapsBtn.style.display = "none";
                }
                const saved = game.save.getCurrentLevel();
                currentLevelIndex = (saved >= 0 && saved < LEVELS.length) ? saved : 0;
                const hasProgress = Object.keys(game.save.data.completed).length > 0;
                if (hasProgress) {
                    document.getElementById("btn-continue").style.display = "block";
                    document.getElementById("welcome-stats").style.display = "block";
                    updateWelcomeProgress();
                }
                setupEventListeners();
                handleMapImportFromUrl();
                gameLoop();
            }

            async function handleMapImportFromUrl() {
                const mapParam = params.get("map");
                if (!mapParam) return;
                if (!api) {
                    showStatus("Comunidade indisponível no momento.", 2400);
                    return;
                }
                try {
                    showStatus("Carregando mapa compartilhado...", 1500);
                    const res = await api.getMap(mapParam);
                    const map = res.data;
                    if (!map || !map.level_json) {
                        showStatus("Mapa não encontrado.", 2200);
                        return;
                    }
                    hideWelcome();
                    loadCommunityMap(map);
                } catch (err) {
                    showStatus("Não foi possível abrir o mapa compartilhado.", 2400);
                }
            }

            function updateWelcomeProgress() {
                const total = LEVELS.length;
                let completed = 0, totalStars = 0;
                LEVELS.forEach(l => { if (game.save.isCompleted(l.id)) completed++; totalStars += game.save.getStars(l.id, l.par); });
                const pct = Math.round((completed / total) * 100);
                document.getElementById("welcome-progress-fill").style.width = pct + "%";
                document.getElementById("welcome-progress-text").textContent = `${completed}/${total} fases · ${totalStars}/${total * 3} ⭐`;
            }

            // ===================== MODE SWITCHING =====================
            function showGameUI() {
                document.getElementById("hud").style.display = "flex";
                document.getElementById("hand-area").style.display = "flex";
                document.getElementById("editor-hud").style.display = "none";
                document.getElementById("editor-toolbar").style.display = "none";
                document.getElementById("btn-editor-hud").style.display = isCustomLevel ? "inline-flex" : "none";
                editor.active = false;
                renderer._resize();
            }

            function showEditorUI() {
                document.getElementById("hud").style.display = "none";
                document.getElementById("hand-area").style.display = "none";
                document.getElementById("editor-hud").style.display = "flex";
                document.getElementById("editor-toolbar").style.display = "flex";
                editor.active = true;
                closeAllModals();
                updateEditorUI();
                renderer._resize();
            }

            function updateEditorUI() {
                document.getElementById("editor-name").value = editor.name;
                document.getElementById("editor-cols-val").textContent = editor.cols;
                document.getElementById("editor-rows-val").textContent = editor.rows;
                document.getElementById("editor-piece-count").textContent = `${editor.getPieceCount()} peças`;
                const ml = document.getElementById("editor-move-limit");
                ml.value = editor.moveLimit || "";
                const par = document.getElementById("editor-par");
                par.value = editor.par || "";
            }

            // ===================== LEVEL LOADING =====================
            function loadLevel(index) {
                if (index < 0 || index >= LEVELS.length) return;
                stopConfetti();
                currentCommunityMapMeta = null;
                currentLevelIndex = index;
                isCustomLevel = false;
                isTutorialLevel = false;
                game.save.setCurrentLevel(index);
                const level = LEVELS[index];
                game.loadLevel(level);
                showGameUI();
                renderer._resize();
                updateHUD();
                updateHand();
                closeAllModals();
                startTimer();
                game.sound.levelStart();
                endTutorialWizard(false);
            }

            const TUTORIAL_WIZARD = window.TUTORIAL_WIZARD || [];

            function loadTutorial() {
                currentCommunityMapMeta = null;
                isTutorialLevel = true;
                isCustomLevel = false;
                tutorialPhases = TUTORIAL_WIZARD;
                tutorialPhaseIndex = 0;
                tutorialActionIndex = 0;
                tutorialPhaseCompleted = false;
                showGameUI();
                document.getElementById("btn-editor-hud").style.display = "none";
                closeAllModals();
                startTutorialPhase(0);
                startTutorialWizard();
            }

            function startTutorialPhase(index) {
                const phase = tutorialPhases[index];
                stopConfetti();
                tutorialActionIndex = 0;
                tutorialPhaseCompleted = !phase.actions || phase.actions.length === 0;
                game.loadLevel(phase.level);
                renderer._resize();
                updateHUD();
                updateHand();
                startTimer();
                game.sound.levelStart();
                updateTutorialWizard();
            }

            function loadCustomLevel(level) {
                stopConfetti();
                isCustomLevel = true;
                isTutorialLevel = false;
                game.loadLevel(level);
                showGameUI();
                renderer._resize();
                updateHUD();
                updateHand();
                closeAllModals();
                startTimer();
                game.sound.levelStart();
                endTutorialWizard(false);
            }

            // ===================== TIMER =====================
            function startTimer() { clearInterval(timerInterval); levelStartTime = Date.now(); levelElapsed = 0; totalPausedMs = 0; pausedAtTime = 0; timerInterval = setInterval(() => { if (game.won) return; levelElapsed = Math.floor((Date.now() - levelStartTime - totalPausedMs) / 1000); document.getElementById("level-timer").textContent = formatTime(levelElapsed); }, 1000); }
            function resumeTimerFromElapsed() { clearInterval(timerInterval); levelStartTime = Date.now() - (levelElapsed * 1000); totalPausedMs = 0; pausedAtTime = 0; timerInterval = setInterval(() => { if (game.won) return; levelElapsed = Math.floor((Date.now() - levelStartTime - totalPausedMs) / 1000); document.getElementById("level-timer").textContent = formatTime(levelElapsed); }, 1000); }
            function pauseTimer() { if (!pausedAtTime) pausedAtTime = Date.now(); }
            function resumeTimer() { if (pausedAtTime) { totalPausedMs += Date.now() - pausedAtTime; pausedAtTime = 0; } }
            function stopTimer() { clearInterval(timerInterval); }
            function formatTime(s) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; }

            // ===================== GAME LOOP =====================
            function gameLoop() {
                if (editor.active) {
                    renderer.drawEditor(editor, editorHoveredCell);
                } else {
                    renderer.draw();
                }
                if (confettiRunning) drawConfetti();
                requestAnimationFrame(gameLoop);
            }

            // ===================== HUD =====================
            function updateHUD() {
                const level = game.currentLevel;
                if (!level) return;
                if (isTutorialLevel && tutorialActive) {
                    const phase = tutorialPhases[tutorialPhaseIndex];
                    document.getElementById("level-name").textContent = `Tutorial: ${phase ? phase.title : "Tutorial"}`;
                } else {
                    document.getElementById("level-name").textContent = isCustomLevel ? `Personalizada: ${level.name}` : `${level.id}. ${level.name}`;
                }
                const moveEl = document.getElementById("move-counter");
                if (game.moveLimit) {
                    moveEl.textContent = `${game.moves}/${game.moveLimit}`;
                    moveEl.classList.toggle("exceeded", game.moveLimitExceeded);
                } else {
                    moveEl.textContent = `${game.moves}`;
                    moveEl.classList.remove("exceeded");
                }
                // Remaining pieces count
                document.getElementById("piece-counter").textContent = `${game.board.size} ⬢`;
            }

            function updateHand() {
                const container = document.getElementById("hand-pieces");
                container.innerHTML = "";
                const pieceColors = {
                    red: "#DD2222", blue: "#2244CC", green: "#22AA22", orange: "#E67E22",
                    yellow: "#EECC00", purple: "#9933CC", white: "#F2F2F2", gray: "#999999", black: "#111111"
                };
                game.hand.forEach((piece, i) => {
                    const el = document.createElement("div");
                    el.className = "hand-piece";
                    if (game.selectedHandPiece === i) el.classList.add("selected");
                    el.style.backgroundColor = pieceColors[piece.color];
                    if (piece.modifier) { const dot = document.createElement("div"); dot.className = "modifier-dot"; dot.style.backgroundColor = pieceColors[piece.modifier]; el.appendChild(dot); }
                    el.addEventListener("click", () => {
                        if (game.won || game.moveLimitExceeded) return;
                        game.sound.click();
                        if (game.selectedHandPiece === i) { game.selectedHandPiece = null; renderer.placementMode = false; } else { game.selectedHandPiece = i; renderer.placementMode = true; }
                        updateHand();
                    });
                    container.appendChild(el);
                });
                document.getElementById("hand-label").textContent = game.hand.length > 0 ? `Mão (${game.hand.length}):` : "Mão: vazia";
            }

            function showStatus(msg, duration) {
                duration = duration || 2000;
                const el = document.getElementById("status-message");
                el.textContent = msg;
                el.classList.add("visible");
                clearTimeout(statusTimeout);
                statusTimeout = setTimeout(() => el.classList.remove("visible"), duration);
            }

            // Tooltip removed per playtester feedback (unnecessary hover info)

            // ===================== TUTORIAL =====================
            function startTutorialWizard() {
                tutorialActive = true;
                game.onWinHook = null;
                document.body.classList.add("tutorial-active");
                document.getElementById("tutorial-wizard").style.display = "block";
                renderer._resize();
                updateTutorialWizard();
            }

            function endTutorialWizard(startCampaign) {
                tutorialActive = false;
                document.body.classList.remove("tutorial-active");
                tutorialPhases = [];
                tutorialPhaseIndex = 0;
                tutorialActionIndex = 0;
                tutorialPhaseCompleted = false;
                renderer.tutorialTarget = null;
                document.getElementById("tutorial-wizard").style.display = "none";
                game.onWinHook = null;
                if (startCampaign) {
                    isTutorialLevel = false;
                    loadLevel(0);
                }
            }

            function getTutorialExpectedAction() {
                if (!tutorialActive) return null;
                const phase = tutorialPhases[tutorialPhaseIndex];
                if (!phase || !phase.actions || phase.actions.length === 0) return null;
                return phase.actions[tutorialActionIndex] || null;
            }

            function updateTutorialWizard() {
                if (!tutorialActive) return;
                const phase = tutorialPhases[tutorialPhaseIndex];
                if (!phase) return;

                const total = tutorialPhases.length;
                document.getElementById("tutorial-step-badge").textContent = "Wizard Onboarding";
                document.getElementById("tutorial-step-progress").textContent = `${tutorialPhaseIndex + 1}/${total}`;
                document.getElementById("tutorial-step-title").textContent = phase.title;
                document.getElementById("tutorial-step-text").textContent = phase.text;
                document.getElementById("tutorial-step-rule").textContent = phase.rule || "";

                const objectiveEl = document.getElementById("tutorial-step-objective");
                const expected = getTutorialExpectedAction();
                if (phase.actions && phase.actions.length > 0) {
                    if (tutorialPhaseCompleted) {
                        objectiveEl.textContent = "Mini-fase concluída. Avance para a próxima etapa.";
                        renderer.tutorialTarget = null;
                    } else {
                        objectiveEl.textContent = expected && expected.hint
                            ? `Objetivo: ${expected.hint}`
                            : "Objetivo: siga a ação destacada no tabuleiro.";
                        renderer.tutorialTarget = expected ? { q: expected.q, r: expected.r, type: expected.type } : null;
                    }
                } else {
                    objectiveEl.textContent = "Etapa informativa. Avance quando estiver pronto.";
                    renderer.tutorialTarget = null;
                }

                const prevBtn = document.getElementById("tutorial-prev");
                const nextBtn = document.getElementById("tutorial-next");
                prevBtn.disabled = tutorialPhaseIndex === 0;

                const canAdvance = tutorialPhaseCompleted || !phase.actions || phase.actions.length === 0;
                nextBtn.disabled = !canAdvance;
                if (tutorialPhaseIndex === total - 1) nextBtn.textContent = "Concluir Tutorial";
                else nextBtn.textContent = "Próximo >";
            }

            function canPerformTutorialAction(q, r, type) {
                if (!tutorialActive) return true;
                const expected = getTutorialExpectedAction();
                if (!expected) return true;
                return expected.type === type && expected.q === q && expected.r === r;
            }

            function registerTutorialAction(q, r, type) {
                if (!tutorialActive) return;
                const phase = tutorialPhases[tutorialPhaseIndex];
                if (!phase || !phase.actions || phase.actions.length === 0) return;
                const expected = getTutorialExpectedAction();
                if (!expected) return;
                if (expected.type !== type || expected.q !== q || expected.r !== r) return;

                tutorialActionIndex++;
                if (tutorialActionIndex >= phase.actions.length) {
                    tutorialPhaseCompleted = true;
                    showStatus("Mini-fase concluída!", 1300);
                }
                updateTutorialWizard();
            }

            function goToTutorialPhase(index) {
                if (!tutorialActive) return;
                if (index < 0 || index >= tutorialPhases.length) return;
                tutorialPhaseIndex = index;
                startTutorialPhase(index);
            }

            function nextTutorialPhase() {
                if (!tutorialActive) return;
                const phase = tutorialPhases[tutorialPhaseIndex];
                const canAdvance = tutorialPhaseCompleted || !phase.actions || phase.actions.length === 0;
                if (!canAdvance) {
                    showStatus("Complete o objetivo atual para avançar.", 1500);
                    return;
                }
                if (tutorialPhaseIndex >= tutorialPhases.length - 1) {
                    endTutorialWizard(true);
                    return;
                }
                goToTutorialPhase(tutorialPhaseIndex + 1);
            }

            function previousTutorialPhase() {
                if (!tutorialActive) return;
                if (tutorialPhaseIndex === 0) return;
                goToTutorialPhase(tutorialPhaseIndex - 1);
            }

            // ===================== CONFETTI =====================
            function spawnConfetti() {
                if (confettiStopTimer) {
                    clearTimeout(confettiStopTimer);
                    confettiStopTimer = null;
                }
                const dpr = window.devicePixelRatio || 1; confettiCanvas.width = window.innerWidth * dpr; confettiCanvas.height = window.innerHeight * dpr; confettiCanvas.style.width = window.innerWidth + "px"; confettiCanvas.style.height = window.innerHeight + "px"; confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
                confettiPieces = []; const colors = ["#00ff88", "#ff4444", "#4488ff", "#ffdd44", "#ff88ff", "#88ffff"];
                for (let i = 0; i < 120; i++) { confettiPieces.push({ x: Math.random() * window.innerWidth, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 10, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)], life: 1 }); }
                confettiRunning = true;
                confettiStopTimer = setTimeout(() => {
                    stopConfetti();
                }, 4000);
            }

            function stopConfetti() {
                if (confettiStopTimer) {
                    clearTimeout(confettiStopTimer);
                    confettiStopTimer = null;
                }
                confettiRunning = false;
                confettiPieces = [];
                confettiCtx.setTransform(1, 0, 0, 1, 0, 0);
                confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            }

            function drawConfetti() {
                confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                for (let i = confettiPieces.length - 1; i >= 0; i--) { const c = confettiPieces[i]; c.x += c.vx; c.y += c.vy; c.vy += 0.08; c.rot += c.rotV; c.life -= 0.003; if (c.life <= 0 || c.y > window.innerHeight + 20) { confettiPieces.splice(i, 1); continue; } confettiCtx.save(); confettiCtx.translate(c.x, c.y); confettiCtx.rotate(c.rot * Math.PI / 180); confettiCtx.globalAlpha = Math.min(c.life, 1); confettiCtx.fillStyle = c.color; confettiCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); confettiCtx.restore(); }
                if (confettiPieces.length === 0) {
                    stopConfetti();
                }
            }

            // ===================== WELCOME =====================
            function hideWelcome() {
                const ws = document.getElementById("welcome-screen");
                ws.classList.add("hiding");
                setTimeout(() => ws.style.display = "none", 600);
            }
            function showWelcome() {
                stopConfetti();
                stopTimer();
                if (tutorialActive) endTutorialWizard(false);
                closeAllModals();
                const community = document.getElementById("community-screen");
                if (community) community.style.display = "none";
                document.getElementById("hud").style.display = "none";
                document.getElementById("hand-area").style.display = "none";
                document.getElementById("editor-hud").style.display = "none";
                document.getElementById("editor-toolbar").style.display = "none";
                editor.active = false;
                const ws = document.getElementById("welcome-screen");
                ws.style.display = "flex";
                ws.classList.remove("hiding");
                updateWelcomeProgress();
            }

            // ===================== COMMUNITY =====================
            function showCommunityScreen() {
                hideWelcome();
                closeAllModals();
                document.getElementById("hud").style.display = "none";
                document.getElementById("hand-area").style.display = "none";
                document.getElementById("editor-hud").style.display = "none";
                document.getElementById("editor-toolbar").style.display = "none";
                document.getElementById("community-screen").style.display = "flex";
                editor.active = false;
                loadCommunityMaps(true);
            }

            function setCommunityState(state) {
                const loading = document.getElementById("community-loading");
                const error = document.getElementById("community-error");
                const empty = document.getElementById("community-empty");
                const grid = document.getElementById("community-grid");
                loading.style.display = state === "loading" ? "block" : "none";
                error.style.display = state === "error" ? "block" : "none";
                empty.style.display = state === "empty" ? "block" : "none";
                grid.style.display = state === "ready" ? "grid" : "none";
            }

            function getCachedFeed(tab) {
                try {
                    const raw = sessionStorage.getItem("hextatics_feed_cache");
                    if (!raw) return null;
                    const cache = JSON.parse(raw);
                    if (cache.tab !== tab) return null;
                    if ((Date.now() - cache.timestamp) > 5 * 60 * 1000) return null;
                    return cache;
                } catch {
                    return null;
                }
            }

            function setCachedFeed(tab, data, nextCursor) {
                try {
                    sessionStorage.setItem("hextatics_feed_cache", JSON.stringify({
                        tab,
                        timestamp: Date.now(),
                        data,
                        nextCursor,
                    }));
                } catch {
                    // ignore cache errors
                }
            }

            function normalizeMapItem(item) {
                return {
                    id: item.id,
                    slug: item.slug,
                    title: item.title || "Sem título",
                    author_name: item.author_name || "Anônimo",
                    likes_count: item.likes_count || 0,
                    win_rate: item.win_rate ?? item.stats?.win_rate ?? 0,
                    piece_count: item.piece_count || item.level_json?.pieceCount || item.level_json?.pieces?.length || 0,
                    grid_cols: item.grid_cols || item.level_json?.gridSize?.cols || 0,
                    grid_rows: item.grid_rows || item.level_json?.gridSize?.rows || 0,
                    level_json: item.level_json,
                    liked_by_me: !!item.liked_by_me,
                };
            }

            async function loadCommunityMaps(reset) {
                if (communityLoading) return;
                if (!api) {
                    setCommunityState("error");
                    return;
                }
                communityLoading = true;

                if (reset) {
                    communityCursor = null;
                    currentFeedMaps = [];
                    const cached = getCachedFeed(communityTab);
                    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
                        currentFeedMaps = cached.data.map(normalizeMapItem);
                        communityCursor = cached.nextCursor || null;
                        renderCommunityGrid();
                        setCommunityState("ready");
                    } else {
                        setCommunityState("loading");
                    }
                }

                try {
                    const result = await api.getMaps(communityTab, reset ? null : communityCursor, 20);
                    const incoming = (result.data || []).map(normalizeMapItem);
                    currentFeedMaps = reset ? incoming : currentFeedMaps.concat(incoming);
                    communityCursor = result.next_cursor || null;
                    setCachedFeed(communityTab, currentFeedMaps, communityCursor);
                    renderCommunityGrid();
                    setCommunityState(currentFeedMaps.length ? "ready" : "empty");
                } catch (err) {
                    if (currentFeedMaps.length) {
                        setCommunityState("ready");
                    } else {
                        setCommunityState("error");
                    }
                } finally {
                    communityLoading = false;
                }
            }

            function renderCommunityGrid() {
                const grid = document.getElementById("community-grid");
                grid.innerHTML = "";
                currentFeedMaps.forEach((map) => {
                    const card = document.createElement("div");
                    card.className = "map-card";
                    const titleEl = document.createElement("div");
                    titleEl.className = "map-card-title";
                    titleEl.textContent = map.title;

                    const authorEl = document.createElement("div");
                    authorEl.className = "map-card-author";
                    authorEl.textContent = `por ${map.author_name}`;

                    const meta1 = document.createElement("div");
                    meta1.className = "map-card-meta";
                    meta1.textContent = `${map.piece_count}⬢ · ${map.grid_cols}x${map.grid_rows}`;

                    const meta2 = document.createElement("div");
                    meta2.className = "map-card-meta";
                    meta2.textContent = `${map.win_rate}% win`;

                    const actions = document.createElement("div");
                    actions.className = "map-card-actions";

                    const playBtn = document.createElement("button");
                    playBtn.className = "btn btn-accent";
                    playBtn.dataset.action = "play";
                    playBtn.textContent = "▶ Jogar";

                    const likeBtn = document.createElement("button");
                    likeBtn.className = "btn";
                    likeBtn.dataset.action = "like";
                    likeBtn.textContent = `${map.liked_by_me ? "💔" : "❤️"} ${map.likes_count}`;

                    const shareBtn = document.createElement("button");
                    shareBtn.className = "btn";
                    shareBtn.dataset.action = "share";
                    shareBtn.textContent = "🔗";

                    actions.appendChild(playBtn);
                    actions.appendChild(likeBtn);
                    actions.appendChild(shareBtn);

                    card.appendChild(titleEl);
                    card.appendChild(authorEl);
                    card.appendChild(meta1);
                    card.appendChild(meta2);
                    card.appendChild(actions);

                    card.querySelector('[data-action="play"]').addEventListener("click", async () => {
                        game.sound.click();
                        loadCommunityMap(map);
                        if (api) {
                            try {
                                const run = await api.startRun(map.id);
                                currentCommunityMapMeta = { ...(currentCommunityMapMeta || {}), runId: run.data?.run_id || null };
                            } catch {
                                // non-blocking
                            }
                        }
                    });

                    card.querySelector('[data-action="like"]').addEventListener("click", async () => {
                        game.sound.click();
                        if (!api) return;
                        try {
                            const res = await api.likeMap(map.id);
                            map.liked_by_me = !!res.data?.liked;
                            map.likes_count = res.data?.likes_count ?? map.likes_count;
                            renderCommunityGrid();
                            showStatus(map.liked_by_me ? "Curtido!" : "Curtida removida", 1200);
                        } catch {
                            showStatus("Não foi possível curtir agora.", 1600);
                        }
                    });

                    card.querySelector('[data-action="share"]').addEventListener("click", async () => {
                        game.sound.click();
                        const shareUrl = `${location.origin}${location.pathname}?map=${encodeURIComponent(map.id || map.slug)}`;
                        try {
                            if (navigator.share) await navigator.share({ title: map.title, text: "Jogue este mapa!", url: shareUrl });
                            else await navigator.clipboard.writeText(shareUrl);
                            showStatus("Link copiado!", 1400);
                        } catch {
                            showStatus("Não foi possível compartilhar.", 1600);
                        }
                    });

                    grid.appendChild(card);
                });

                document.getElementById("community-load-more").style.display = communityCursor ? "inline-block" : "none";
            }

            function loadCommunityMap(map) {
                const level = map.level_json;
                currentCommunityMapMeta = { id: map.id, slug: map.slug, title: map.title, liked_by_me: !!map.liked_by_me, likes_count: map.likes_count || 0 };
                document.getElementById("community-screen").style.display = "none";
                loadCustomLevel(level);
            }

            function openPublishModal(level) {
                pendingPublishLevel = level;
                const pieceCount = level.pieceCount || level.pieces?.length || 0;
                document.getElementById("publish-preview").textContent = `${level.name} · ${pieceCount} peças · ${level.gridSize.cols}x${level.gridSize.rows}`;
                showOverlay("publish-modal");
            }

            function validateLevelPayload(level) {
                const errors = [];
                if (!level?.gridSize || level.gridSize.cols < 2 || level.gridSize.cols > 12 || level.gridSize.rows < 2 || level.gridSize.rows > 10) {
                    errors.push("gridSize inválido");
                }
                if (!Array.isArray(level?.mask) || level.mask.length !== level.gridSize?.rows) {
                    errors.push("mask inválida");
                }
                if (!Array.isArray(level?.pieces) || level.pieces.length === 0 || level.pieces.length > 50) {
                    errors.push("pieces inválido (0-50)");
                }
                const validColors = ["red", "blue", "green", "orange", "yellow", "purple", "white", "gray", "black"];
                for (const p of level?.pieces || []) {
                    if (!Number.isInteger(p.q) || !Number.isInteger(p.r)) errors.push("coordenada inválida");
                    if (!validColors.includes(p.color)) errors.push("cor inválida");
                    if (p.modifier && !validColors.includes(p.modifier)) errors.push("modifier inválido");
                    if (p.q < 0 || p.q >= level.gridSize.cols || p.r < 0 || p.r >= level.gridSize.rows) errors.push("peça fora do grid");
                }
                if (level.moveLimit !== null && level.moveLimit !== undefined) {
                    if (!Number.isInteger(level.moveLimit) || level.moveLimit < 1 || level.moveLimit > 99) errors.push("moveLimit inválido");
                }
                if (!Number.isInteger(level.par) || level.par < 1 || level.par > 99) errors.push("par inválido");
                if (JSON.stringify(level).length > 10240) errors.push("payload excede 10KB");
                return { valid: errors.length === 0, errors };
            }

            async function confirmPublish() {
                if (!api) {
                    showStatus("Comunidade indisponível no momento.", 2200);
                    return;
                }
                if (!pendingPublishLevel) return;
                const validation = validateLevelPayload(pendingPublishLevel);
                if (!validation.valid) {
                    showStatus(`Mapa inválido: ${validation.errors[0]}`, 2600);
                    return;
                }
                const author = (document.getElementById("publish-author").value || "Anônimo").trim();
                const title = (pendingPublishLevel.name || "Meu Mapa").trim();
                try {
                    showStatus("Seu mapa está sendo publicado...", 1400);
                    await api.publishMap(pendingPublishLevel, author, title);
                    closeAllModals();
                    showStatus("Mapa publicado!", 2000);
                } catch (err) {
                    const msg = String(err.message || "");
                    if (/duplicate|duplicado|exists/i.test(msg)) showStatus("Este mapa já foi publicado antes.", 2200);
                    else if (/429|limit|rate/i.test(msg)) showStatus("Muitas publicações hoje. Tente novamente amanhã.", 2400);
                    else showStatus("Erro ao publicar. Tente novamente.", 2200);
                }
            }

            async function confirmReport() {
                if (!api || !pendingReportMapId) return;
                const reason = document.getElementById("report-reason").value;
                const detail = document.getElementById("report-detail").value.trim();
                try {
                    await api.reportMap(pendingReportMapId, reason, detail);
                    closeAllModals();
                    showStatus("Denúncia enviada. Obrigado!", 1800);
                } catch (err) {
                    const msg = String(err.message || "");
                    if (/already|unique|409/i.test(msg)) showStatus("Você já denunciou este mapa.", 1800);
                    else showStatus("Não foi possível enviar a denúncia.", 1800);
                }
            }

            // ===================== MODAIS =====================
            function closeAllModals() {
                document.getElementById("overlay").classList.remove("active");
                ["win-modal", "lose-modal", "level-select-modal", "help-modal", "game-complete-modal", "pause-modal", "publish-modal", "report-modal"].forEach(id => document.getElementById(id).style.display = "none");
            }
            function showOverlay(modalId) { closeAllModals(); document.getElementById("overlay").classList.add("active"); document.getElementById(modalId).style.display = "block"; }

            function showWinModal() {
                stopTimer();
                const level = game.currentLevel;
                const stars = level.par ? game.save.getStars(level.id, level.par) : 3;

                if (isCustomLevel && currentCommunityMapMeta && api) {
                    api.completeRun(
                        currentCommunityMapMeta.id,
                        currentCommunityMapMeta.runId || null,
                        game.moves,
                        levelElapsed,
                        true
                    ).catch(() => {
                        // non-blocking telemetry
                    });
                }

                if (!isCustomLevel && !isTutorialLevel) {
                    const isLast = currentLevelIndex >= LEVELS.length - 1;
                    let allComplete = true;
                    LEVELS.forEach(l => { if (!game.save.isCompleted(l.id)) allComplete = false; });
                    if (allComplete && isLast) { showGameCompleteModal(); return; }
                }

                document.getElementById("win-level-name").textContent = level.name;
                const starsEl = document.getElementById("win-stars");
                starsEl.innerHTML = "";
                for (let i = 1; i <= 3; i++) { const s = document.createElement("span"); s.className = "win-star"; s.textContent = "⭐"; if (i > stars) s.classList.add("star-off"); s.style.animationDelay = `${i * 0.2}s`; starsEl.appendChild(s); }

                document.getElementById("win-moves").textContent = game.moves;
                document.getElementById("win-par").textContent = level.par || "--";
                document.getElementById("win-time").textContent = formatTime(levelElapsed);

                const bestMsg = document.getElementById("win-best-msg");
                if (isTutorialLevel) {
                    bestMsg.textContent = "Tutorial completo!";
                    bestMsg.className = "win-best-msg perfect";
                } else if (!isCustomLevel) {
                    const best = game.save.getBestMoves(level.id);
                    if (best && best === game.moves && stars === 3) { bestMsg.textContent = "🏅 Solução perfeita!"; bestMsg.className = "win-best-msg perfect"; }
                    else if (best && best < game.moves) { bestMsg.textContent = `Seu recorde: ${best} movimentos`; bestMsg.className = "win-best-msg"; }
                    else { bestMsg.textContent = "Novo recorde!"; bestMsg.className = "win-best-msg new-record"; }
                } else { bestMsg.textContent = ""; }

                document.getElementById("btn-next-level").style.display = (isCustomLevel && !isTutorialLevel) ? "none" : "inline-block";
                document.getElementById("btn-back-editor").style.display = (isCustomLevel && !isTutorialLevel) ? "inline-block" : "none";
                const likeBtn = document.getElementById("btn-like-map");
                const publishBtn = document.getElementById("btn-publish-win");
                if (likeBtn) likeBtn.style.display = (isCustomLevel && !!currentCommunityMapMeta) ? "inline-block" : "none";
                if (publishBtn) publishBtn.style.display = (isCustomLevel && !currentCommunityMapMeta) ? "inline-block" : "none";
                if (isTutorialLevel) {
                    document.getElementById("btn-next-level").textContent = "Começar!";
                } else if (!isCustomLevel) {
                    document.getElementById("btn-next-level").textContent = currentLevelIndex >= LEVELS.length - 1 ? "Ver Resultados" : "Próxima Fase >";
                }

                spawnConfetti(); game.sound.win(); showOverlay("win-modal");
            }

            function showGameCompleteModal() {
                stopTimer();
                let totalStars = 0; LEVELS.forEach(l => { totalStars += game.save.getStars(l.id, l.par); });
                const starsEl = document.getElementById("total-stars"); starsEl.innerHTML = "";
                for (let i = 0; i < totalStars; i++) { const s = document.createElement("span"); s.textContent = "⭐"; s.style.animationDelay = `${i * 0.05}s`; s.className = "win-star"; starsEl.appendChild(s); }
                document.getElementById("total-stars-text").textContent = `${totalStars} de ${LEVELS.length * 3} estrelas conquistadas!`;
                spawnConfetti(); spawnConfetti(); game.sound.win(); showOverlay("game-complete-modal");
            }

            function showLoseModal() { stopTimer(); showOverlay("lose-modal"); }

            function showLevelSelect() {
                const grid = document.getElementById("level-grid");
                grid.innerHTML = "";
                let completedCount = 0, totalStars = 0;
                LEVELS.forEach((level, i) => {
                    const card = document.createElement("div"); card.className = "level-card";
                    const unlocked = game.save.isUnlocked(level.id, LEVELS), completed = game.save.isCompleted(level.id), stars = game.save.getStars(level.id, level.par);
                    if (completed) { completedCount++; totalStars += stars; }
                    if (completed) card.classList.add("completed");
                    if (!unlocked) card.classList.add("locked");
                    if (i === currentLevelIndex && !isCustomLevel) card.classList.add("current");
                    if (unlocked) {
                        const numEl = document.createElement("div");
                        numEl.className = "level-num";
                        numEl.textContent = String(level.id);

                        const titleEl = document.createElement("div");
                        titleEl.className = "level-title";
                        titleEl.textContent = level.name;

                        const starsEl = document.createElement("div");
                        starsEl.className = "level-stars";
                        for (let s = 1; s <= 3; s++) {
                            const starEl = document.createElement("span");
                            if (s <= stars) {
                                starEl.textContent = "⭐";
                            } else {
                                starEl.textContent = "☆";
                                starEl.className = "star-off";
                            }
                            starsEl.appendChild(starEl);
                        }

                        card.appendChild(numEl);
                        card.appendChild(titleEl);
                        card.appendChild(starsEl);
                        card.addEventListener("click", () => { game.sound.click(); loadLevel(i); });
                    } else {
                        const lockEl = document.createElement("div");
                        lockEl.className = "lock-icon";
                        lockEl.textContent = "🔒";

                        const titleEl = document.createElement("div");
                        titleEl.className = "level-title";
                        titleEl.textContent = level.name;

                        card.appendChild(lockEl);
                        card.appendChild(titleEl);
                    }
                    grid.appendChild(card);
                });

                // Progress bar
                const pct = Math.round((completedCount / LEVELS.length) * 100);
                document.getElementById("level-progress-fill").style.width = pct + "%";
                document.getElementById("level-progress-text").textContent = `${completedCount}/${LEVELS.length} completas · ${totalStars}/${LEVELS.length * 3} ⭐`;

                // Custom levels
                const customSection = document.getElementById("custom-levels-section");
                const customGrid = document.getElementById("custom-level-grid");
                editor.loadCustomLevels();
                if (editor.customLevels.length > 0) {
                    customSection.style.display = "block";
                    customGrid.innerHTML = "";
                    editor.customLevels.slice().reverse().forEach(level => {
                        const card = document.createElement("div");
                        card.className = "level-card custom-card";
                        const dateStr = level.createdAt ? new Date(level.createdAt).toLocaleDateString("pt-BR") : "";
                        const pCount = level.pieceCount || level.pieces.length;
                        const desc = level.description || `${pCount} peças`;

                        const header = document.createElement("div");
                        header.className = "custom-card-header";

                        const icon = document.createElement("div");
                        icon.className = "custom-card-icon";
                        icon.textContent = "HEX";

                        const info = document.createElement("div");
                        info.className = "custom-card-info";

                        const nameEl = document.createElement("div");
                        nameEl.className = "custom-card-name";
                        nameEl.textContent = level.name;

                        const metaEl = document.createElement("div");
                        metaEl.className = "custom-card-meta";
                        metaEl.textContent = `${pCount} peças · ${level.gridSize.cols}x${level.gridSize.rows}${dateStr ? " · " + dateStr : ""}`;

                        const descEl = document.createElement("div");
                        descEl.className = "custom-card-desc";
                        descEl.textContent = desc;

                        info.appendChild(nameEl);
                        info.appendChild(metaEl);
                        info.appendChild(descEl);
                        header.appendChild(icon);
                        header.appendChild(info);

                        const actions = document.createElement("div");
                        actions.className = "custom-card-actions";

                        function makeAction(label, action, title, className) {
                            const btn = document.createElement("button");
                            btn.className = className || "btn btn-tiny";
                            btn.dataset.action = action;
                            btn.title = title;
                            btn.textContent = label;
                            return btn;
                        }

                        actions.appendChild(makeAction("Jogar", "play", "Jogar", "btn btn-tiny btn-accent"));
                        actions.appendChild(makeAction("Editar", "edit", "Editar"));
                        actions.appendChild(makeAction("Copiar", "share", "Compartilhar código"));
                        actions.appendChild(makeAction("Duplicar", "duplicate", "Duplicar"));
                        actions.appendChild(makeAction("Excluir", "delete", "Excluir", "btn btn-tiny btn-reset"));

                        card.appendChild(header);
                        card.appendChild(actions);
                        card.querySelector('[data-action="play"]').addEventListener("click", (e) => { e.stopPropagation(); game.sound.click(); loadCustomLevel(level); });
                        card.querySelector('[data-action="edit"]').addEventListener("click", (e) => { e.stopPropagation(); game.sound.click(); editor.loadFromLevel(level); editor.editingId = level.id; enterEditor(); });
                        card.querySelector('[data-action="share"]').addEventListener("click", (e) => {
                            e.stopPropagation(); game.sound.click();
                            const code = Editor.codeFromLevel(level);
                            navigator.clipboard.writeText(code).then(() => showStatus("Código copiado!", 2000)).catch(() => prompt("Copie:", code));
                        });
                        card.querySelector('[data-action="duplicate"]').addEventListener("click", (e) => { e.stopPropagation(); game.sound.click(); editor.duplicateCustomLevel(level.id); showLevelSelect(); showStatus("Fase duplicada!", 1500); });
                        card.querySelector('[data-action="delete"]').addEventListener("click", (e) => { e.stopPropagation(); if (confirm(`Excluir "${level.name}"?`)) { editor.deleteCustomLevel(level.id); showLevelSelect(); } });
                        customGrid.appendChild(card);
                    });
                } else {
                    customSection.style.display = "none";
                }

                showOverlay("level-select-modal");
            }

            // ===================== EDITOR =====================
            function enterEditor() {
                currentCommunityMapMeta = null;
                hideWelcome();
                showEditorUI();
            }

            function exitEditor() {
                editor.active = false;
                showWelcome();
            }

            function editorTest() {
                editor.name = document.getElementById("editor-name").value;
                const ml = document.getElementById("editor-move-limit").value;
                editor.moveLimit = ml ? parseInt(ml) : null;
                const par = document.getElementById("editor-par").value;
                editor.par = par ? parseInt(par) : null;

                if (editor.getPieceCount() === 0) { showStatus("Coloque pelo menos 1 peça!", 2000); return; }
                const level = editor.toLevel();
                loadCustomLevel(level);
            }

            function editorSave() {
                editor.name = document.getElementById("editor-name").value;
                const ml = document.getElementById("editor-move-limit").value;
                editor.moveLimit = ml ? parseInt(ml) : null;
                const par = document.getElementById("editor-par").value;
                editor.par = par ? parseInt(par) : null;

                if (editor.getPieceCount() === 0) { showStatus("Coloque pelo menos 1 peça!", 2000); return; }
                editor.saveCustomLevel();
                showStatus("Fase salva!", 2000);
            }

            // ===================== EVENTS =====================
            function setupEventListeners() {
                // Welcome
                document.getElementById("btn-tutorial").addEventListener("click", () => { game.sound._init(); game.sound.click(); hideWelcome(); loadTutorial(); });
                document.getElementById("btn-start").addEventListener("click", () => { game.sound._init(); game.sound.click(); hideWelcome(); loadLevel(0); });
                document.getElementById("btn-maps").addEventListener("click", () => { game.sound._init(); game.sound.click(); showCommunityScreen(); });
                document.getElementById("btn-continue").addEventListener("click", () => { game.sound._init(); game.sound.click(); hideWelcome(); loadLevel(currentLevelIndex); });
                document.getElementById("btn-editor-welcome").addEventListener("click", () => { game.sound._init(); game.sound.click(); editor.reset(); enterEditor(); });

                // Community
                document.getElementById("community-back").addEventListener("click", () => { game.sound.click(); showWelcome(); });
                document.getElementById("community-retry").addEventListener("click", () => { game.sound.click(); loadCommunityMaps(true); });
                document.getElementById("community-load-more").addEventListener("click", () => { game.sound.click(); loadCommunityMaps(false); });
                document.querySelectorAll(".community-tab").forEach(btn => {
                    btn.addEventListener("click", () => {
                        if (communityLoading) return;
                        game.sound.click();
                        document.querySelectorAll(".community-tab").forEach(tabBtn => tabBtn.classList.remove("active"));
                        btn.classList.add("active");
                        communityTab = btn.dataset.tab;
                        loadCommunityMaps(true);
                    });
                });

                // Canvas (game + editor)
                canvas.addEventListener("click", (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const px = e.clientX - rect.left, py = e.clientY - rect.top;
                    if (editor.active) {
                        const cell = renderer.editorPixelToHex(px, py, editor);
                        if (cell) { editor.handleClick(cell.q, cell.r); updateEditorUI(); }
                    } else {
                        const cell = renderer.pixelToHex(px, py);
                        if (cell) handleInteraction(cell);
                    }
                });

                canvas.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    if (editor.active) {
                        const rect = canvas.getBoundingClientRect();
                        const cell = renderer.editorPixelToHex(e.clientX - rect.left, e.clientY - rect.top, editor);
                        if (cell) { const key = `${cell.q},${cell.r}`; editor.pieces.delete(key); updateEditorUI(); }
                    }
                });

                // Touch
                canvas.addEventListener("touchstart", (e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const rect = canvas.getBoundingClientRect();
                    if (editor.active) { editorHoveredCell = renderer.editorPixelToHex(touch.clientX - rect.left, touch.clientY - rect.top, editor); }
                    else { renderer.hoveredCell = renderer.pixelToHex(touch.clientX - rect.left, touch.clientY - rect.top); }
                }, { passive: false });

                canvas.addEventListener("touchend", (e) => {
                    e.preventDefault();
                    if (editor.active) { if (editorHoveredCell) { editor.handleClick(editorHoveredCell.q, editorHoveredCell.r); updateEditorUI(); } }
                    else { if (renderer.hoveredCell) handleInteraction(renderer.hoveredCell); }
                }, { passive: false });

                // Mouse move (tooltip removed per feedback)
                canvas.addEventListener("mousemove", (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const px = e.clientX - rect.left, py = e.clientY - rect.top;
                    if (editor.active) { editorHoveredCell = renderer.editorPixelToHex(px, py, editor); }
                    else { renderer.hoveredCell = renderer.pixelToHex(px, py); }
                });
                canvas.addEventListener("mouseleave", () => { renderer.hoveredCell = null; editorHoveredCell = null; });

                // HUD buttons
                document.getElementById("btn-undo").addEventListener("click", doUndo);
                document.getElementById("btn-pause").addEventListener("click", () => {
                    game.sound.click();
                    pauseTimer();
                    const level = game.currentLevel;
                    if (level) document.getElementById("pause-level-info").textContent = isCustomLevel ? `Personalizada: ${level.name}` : `Fase ${level.id} - ${level.name}`;
                    showOverlay("pause-modal");
                });
                document.getElementById("btn-editor-hud").addEventListener("click", () => { game.sound.click(); showEditorUI(); });

                // Pause menu
                document.getElementById("btn-resume").addEventListener("click", () => { game.sound.click(); resumeTimer(); closeAllModals(); });
                document.getElementById("btn-restart-pause").addEventListener("click", () => { game.sound.click(); doReset(); });
                document.getElementById("btn-levels-pause").addEventListener("click", () => { game.sound.click(); closeAllModals(); showLevelSelect(); });
                document.getElementById("btn-help-pause").addEventListener("click", () => { game.sound.click(); closeAllModals(); showOverlay("help-modal"); });
                document.getElementById("btn-home").addEventListener("click", () => { game.sound.click(); showWelcome(); });

                // Win modal
                document.getElementById("btn-next-level").addEventListener("click", () => {
                    game.sound.click();
                    if (isTutorialLevel) { isTutorialLevel = false; loadLevel(0); }
                    else if (currentLevelIndex < LEVELS.length - 1) loadLevel(currentLevelIndex + 1);
                    else showGameCompleteModal();
                });
                document.getElementById("btn-replay").addEventListener("click", () => { game.sound.click(); if (isCustomLevel) loadCustomLevel(game.currentLevel); else loadLevel(currentLevelIndex); });
                document.getElementById("btn-levels-win").addEventListener("click", () => { game.sound.click(); closeAllModals(); showLevelSelect(); });
                document.getElementById("btn-back-editor").addEventListener("click", () => { game.sound.click(); closeAllModals(); showEditorUI(); });
                const likeMapBtn = document.getElementById("btn-like-map");
                if (likeMapBtn) {
                    likeMapBtn.addEventListener("click", async () => {
                        game.sound.click();
                        if (!api || !currentCommunityMapMeta) return;
                        try {
                            const res = await api.likeMap(currentCommunityMapMeta.id);
                            currentCommunityMapMeta.liked_by_me = !!res.data?.liked;
                            currentCommunityMapMeta.likes_count = res.data?.likes_count ?? currentCommunityMapMeta.likes_count;
                            showStatus(currentCommunityMapMeta.liked_by_me ? "Curtido!" : "Curtida removida", 1200);
                        } catch {
                            showStatus("Não foi possível curtir agora.", 1600);
                        }
                    });
                }
                const publishWinBtn = document.getElementById("btn-publish-win");
                if (publishWinBtn) {
                    publishWinBtn.addEventListener("click", () => {
                        game.sound.click();
                        if (!game.currentLevel) return;
                        openPublishModal(game.currentLevel);
                    });
                }

                // Game complete
                document.getElementById("btn-replay-all").addEventListener("click", () => { game.sound.click(); loadLevel(0); });
                document.getElementById("btn-levels-complete").addEventListener("click", () => { game.sound.click(); closeAllModals(); showLevelSelect(); });

                // Lose modal
                document.getElementById("btn-undo-lose").addEventListener("click", () => { if (game.undo()) { game.sound.undo(); closeAllModals(); resumeTimerFromElapsed(); updateHUD(); updateHand(); } });
                document.getElementById("btn-reset-lose").addEventListener("click", doReset);
                document.getElementById("btn-levels-lose").addEventListener("click", () => { game.sound.click(); closeAllModals(); showLevelSelect(); });

                // Close buttons
                document.getElementById("btn-close-levels").addEventListener("click", () => { game.sound.click(); closeAllModals(); });
                document.getElementById("btn-close-help").addEventListener("click", () => { game.sound.click(); closeAllModals(); });
                document.getElementById("btn-open-editor-from-levels").addEventListener("click", () => { game.sound.click(); closeAllModals(); editor.reset(); enterEditor(); });

                // Tutorial wizard
                document.getElementById("tutorial-prev").addEventListener("click", () => { game.sound.click(); previousTutorialPhase(); });
                document.getElementById("tutorial-next").addEventListener("click", () => { game.sound.click(); nextTutorialPhase(); });
                document.getElementById("tutorial-skip").addEventListener("click", () => { game.sound.click(); endTutorialWizard(true); });

                // ---- EDITOR EVENTS ----
                document.getElementById("editor-back").addEventListener("click", () => { game.sound.click(); exitEditor(); });
                document.getElementById("editor-clear").addEventListener("click", () => { if (confirm("Limpar tudo?")) { editor.clear(); updateEditorUI(); } });

                // Grid size
                document.getElementById("editor-cols-minus").addEventListener("click", () => { editor.resizeGrid(editor.cols - 1, editor.rows); updateEditorUI(); });
                document.getElementById("editor-cols-plus").addEventListener("click", () => { editor.resizeGrid(editor.cols + 1, editor.rows); updateEditorUI(); });
                document.getElementById("editor-rows-minus").addEventListener("click", () => { editor.resizeGrid(editor.cols, editor.rows - 1); updateEditorUI(); });
                document.getElementById("editor-rows-plus").addEventListener("click", () => { editor.resizeGrid(editor.cols, editor.rows + 1); updateEditorUI(); });

                // Tool selection
                document.querySelectorAll(".editor-tool").forEach(btn => {
                    btn.addEventListener("click", () => {
                        document.querySelectorAll(".editor-tool").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                        editor.tool = btn.dataset.tool;
                        document.getElementById("editor-mod-palette").style.display = editor.tool === "modifier" ? "flex" : "none";
                    });
                });

                // Modifier palette
                document.querySelectorAll(".editor-mod").forEach(btn => {
                    btn.addEventListener("click", () => {
                        document.querySelectorAll(".editor-mod").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                        editor.modifierColor = btn.dataset.mod;
                    });
                });

                // Editor actions
                document.getElementById("editor-test").addEventListener("click", () => { game.sound.click(); editorTest(); });
                document.getElementById("editor-save").addEventListener("click", () => { game.sound.click(); editorSave(); });
                document.getElementById("editor-publish").addEventListener("click", () => {
                    game.sound.click();
                    editor.name = document.getElementById("editor-name").value;
                    const ml = document.getElementById("editor-move-limit").value;
                    editor.moveLimit = ml ? parseInt(ml) : null;
                    const par = document.getElementById("editor-par").value;
                    editor.par = par ? parseInt(par) : null;
                    if (editor.getPieceCount() === 0) {
                        showStatus("Coloque pelo menos 1 peça!", 1800);
                        return;
                    }
                    openPublishModal(editor.toLevel());
                });
                document.getElementById("editor-export").addEventListener("click", () => {
                    editor.name = document.getElementById("editor-name").value;
                    const code = editor.exportCode();
                    navigator.clipboard.writeText(code).then(() => showStatus("Código copiado!", 2000)).catch(() => { prompt("Copie o código:", code); });
                });
                document.getElementById("editor-import").addEventListener("click", () => {
                    const input = prompt("Cole o código (HEX-...) ou JSON da fase:");
                    if (input && editor.importCode(input)) { updateEditorUI(); showStatus("Fase importada!", 2000); }
                    else if (input) { showStatus("Código inválido!", 2000); }
                });

                // Editor name sync
                document.getElementById("editor-name").addEventListener("input", (e) => { editor.name = e.target.value; });

                // Publish/report modals
                document.getElementById("publish-confirm").addEventListener("click", () => { confirmPublish(); });
                document.getElementById("publish-cancel").addEventListener("click", () => { closeAllModals(); });
                document.getElementById("report-confirm").addEventListener("click", () => { confirmReport(); });
                document.getElementById("report-cancel").addEventListener("click", () => { closeAllModals(); });

                // Keyboard
                document.addEventListener("keydown", (e) => {
                    if (e.ctrlKey && e.key === "z") { e.preventDefault(); doUndo(); }
                    if (e.key === "Escape") {
                        if (game.selectedHandPiece !== null) { game.selectedHandPiece = null; renderer.placementMode = false; updateHand(); }
                        else closeAllModals();
                    }
                });

                window.addEventListener("resize", () => renderer._resize());
            }

            function handleInteraction(cell) {
                if (game.won) return;
                if (game.selectedHandPiece !== null) {
                    const piece = game.getPiece(cell.q, cell.r);
                    if (!piece) {
                        if (tutorialActive && !canPerformTutorialAction(cell.q, cell.r, "place")) {
                            showStatus("Siga o objetivo da mini-fase.", 1500);
                            game.sound.error();
                            return;
                        }
                        if (game.placePiece(cell.q, cell.r, game.selectedHandPiece)) {
                            game.sound.place(); renderer.addAnimation(cell.q, cell.r, "fadeIn", 200);
                            registerTutorialAction(cell.q, cell.r, "place");
                            // Auto-select next hand piece for faster workflow
                            if (game.hand.length > 0) {
                                game.selectedHandPiece = Math.min(game.selectedHandPiece, game.hand.length - 1);
                                renderer.placementMode = true;
                            } else {
                                game.selectedHandPiece = null;
                                renderer.placementMode = false;
                            }
                            updateHUD(); updateHand();
                            if (game.checkWin()) {
                                if (tutorialActive) {
                                    tutorialPhaseCompleted = true;
                                    updateTutorialWizard();
                                } else {
                                    setTimeout(() => showWinModal(), 400);
                                }
                            }
                            else if (game.moveLimitExceeded) showLoseModal();
                        }
                    } else { game.selectedHandPiece = null; renderer.placementMode = false; updateHand(); handleRemove(cell); }
                    return;
                }
                handleRemove(cell);
            }

            function handleRemove(cell) {
                if (game.moveLimitExceeded) { showLoseModal(); return; }
                const piece = game.getPiece(cell.q, cell.r);
                if (!piece) return;
                if (game.canRemove(cell.q, cell.r)) {
                    if (tutorialActive && !canPerformTutorialAction(cell.q, cell.r, "remove")) { showStatus("Siga o objetivo da mini-fase.", 1500); game.sound.error(); return; }
                    // Remove imediatamente do estado para evitar race condition em cliques rápidos
                    const removedColor = piece.color;
                    game.removePiece(cell.q, cell.r);
                    registerTutorialAction(cell.q, cell.r, "remove");
                    game.sound.remove(); renderer.addAnimation(cell.q, cell.r, "fadeOut", 200); renderer.spawnRemoveParticles(cell.q, cell.r, removedColor);
                    updateHUD(); updateHand();
                    if (game.checkWin()) {
                        if (tutorialActive) {
                            tutorialPhaseCompleted = true;
                            updateTutorialWizard();
                        } else {
                            setTimeout(() => showWinModal(), 400);
                        }
                    }
                    else if (game.moveLimitExceeded) showLoseModal();
                } else { game.sound.error(); showStatus("Esta peça não pode ser removida agora!", 1800); }
            }

            function doUndo() { if (game.undo()) { game.sound.undo(); renderer.placementMode = false; closeAllModals(); updateHUD(); updateHand(); } }
            function doReset() {
                game.sound.click(); game.reset(); renderer.placementMode = false; renderer._resize(); closeAllModals(); startTimer(); updateHUD(); updateHand();
                if (tutorialActive) {
                    startTutorialPhase(tutorialPhaseIndex);
                    startTutorialWizard();
                }
            }

            init();
        })();
