// game.js — Lógica principal do HexTatics
// Contém: regras de peças, undo, save/load, som, tutorial, e detecção de vitória.

// ===================== SISTEMA DE SOM (Web Audio API) =====================
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    _init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    _play(freq, type, duration, vol) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    remove() {
        this._init();
        this._play(523.25, "sine", 0.15, 0.5);
        setTimeout(() => this._play(659.25, "sine", 0.1, 0.3), 60);
    }

    place() {
        this._init();
        this._play(392, "sine", 0.12, 0.4);
    }

    error() {
        this._init();
        this._play(200, "square", 0.2, 0.3);
    }

    undo() {
        this._init();
        this._play(330, "triangle", 0.15, 0.3);
    }

    win() {
        this._init();
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
            setTimeout(() => this._play(f, "sine", 0.3, 0.4), i * 120);
        });
    }

    click() {
        this._init();
        this._play(440, "sine", 0.05, 0.15);
    }

    levelStart() {
        this._init();
        this._play(440, "sine", 0.1, 0.2);
        setTimeout(() => this._play(554, "sine", 0.15, 0.2), 80);
    }
}

// ===================== SAVE SYSTEM =====================
class SaveManager {
    constructor() {
        this.key = "hextatics_save";
        this.data = this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { completed: {}, bestMoves: {}, currentLevel: 0 };
    }

    _save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.data));
        } catch (e) { /* ignore */ }
    }

    completeLevel(levelId, moves) {
        this.data.completed[levelId] = true;
        const prev = this.data.bestMoves[levelId];
        if (!prev || moves < prev) {
            this.data.bestMoves[levelId] = moves;
        }
        this._save();
    }

    isCompleted(levelId) {
        return !!this.data.completed[levelId];
    }

    getBestMoves(levelId) {
        return this.data.bestMoves[levelId] || null;
    }

    isUnlocked(levelId, levels) {
        if (Array.isArray(levels) && levels.length > 0) {
            const idx = levels.findIndex(l => l.id === levelId);
            if (idx <= 0) return idx === 0;
            return this.isCompleted(levels[idx - 1].id);
        }
        if (levelId === 1) return true;
        return this.isCompleted(levelId - 1);
    }

    setCurrentLevel(index) {
        this.data.currentLevel = index;
        this._save();
    }

    getCurrentLevel() {
        return this.data.currentLevel || 0;
    }

    getStars(levelId, par) {
        const best = this.getBestMoves(levelId);
        if (!best) return 0;
        if (best <= par) return 3;
        if (best <= par + 2) return 2;
        return 1;
    }
}

// ===================== GAME LOGIC =====================
class Game {
    constructor() {
        this.board = new Map();
        this.mask = [];
        this.hand = [];
        this.moves = 0;
        this.moveLimit = null;
        this.history = [];
        this.currentLevel = null;
        this.gridSize = { cols: 0, rows: 0 };
        this.won = false;
        this.moveLimitExceeded = false;
        this.selectedHandPiece = null;
        this.lastRemovedPiece = null;
        this.sound = new SoundManager();
        this.save = new SaveManager();
    }

    loadLevel(levelDef) {
        this.board = new Map();
        this.mask = levelDef.mask;
        this.gridSize = { ...levelDef.gridSize };
        this.moveLimit = levelDef.moveLimit;
        this.moves = 0;
        this.hand = [];
        this.history = [];
        this.currentLevel = levelDef;
        this.won = false;
        this.moveLimitExceeded = false;
        this.selectedHandPiece = null;
        this.lastRemovedPiece = null;

        for (const p of levelDef.pieces) {
            const key = `${p.q},${p.r}`;
            this.board.set(key, { color: p.color, modifier: p.modifier || null });
        }
    }

    reset() {
        if (this.currentLevel) this.loadLevel(this.currentLevel);
    }

    // ===================== HEX GRID NEIGHBORS =====================

    getNeighbors(q, r) {
        const isOddCol = q % 2 !== 0;
        const directions = isOddCol
            ? [
                { dq: +1, dr: 0, dir: "NE" }, { dq: +1, dr: +1, dir: "SE" },
                { dq: 0, dr: +1, dir: "S" }, { dq: -1, dr: +1, dir: "SW" },
                { dq: -1, dr: 0, dir: "NW" }, { dq: 0, dr: -1, dir: "N" },
            ]
            : [
                { dq: +1, dr: -1, dir: "NE" }, { dq: +1, dr: 0, dir: "SE" },
                { dq: 0, dr: +1, dir: "S" }, { dq: -1, dr: 0, dir: "SW" },
                { dq: -1, dr: -1, dir: "NW" }, { dq: 0, dr: -1, dir: "N" },
            ];

        return directions.map(d => ({
            q: q + d.dq, r: r + d.dr, dir: d.dir,
        }));
    }

    cellExists(q, r) {
        if (q < 0 || r < 0 || q >= this.gridSize.cols || r >= this.gridSize.rows) return false;
        return this.mask[r] && this.mask[r][q];
    }

    getPiece(q, r) {
        return this.board.get(`${q},${r}`) || null;
    }

    getAllCells() {
        const cells = [];
        for (let r = 0; r < this.gridSize.rows; r++) {
            for (let q = 0; q < this.gridSize.cols; q++) {
                if (this.cellExists(q, r)) cells.push({ q, r });
            }
        }
        return cells;
    }

    static OPPOSITES = { NE: "SW", SW: "NE", SE: "NW", NW: "SE", N: "S", S: "N" };

    static DIR_ORDER = ["NE", "SE", "S", "SW", "NW", "N"];

    _matchesNeighborFilter(piece, neighborPiece, options = {}) {
        if (!neighborPiece) return false;
        if (piece.modifier) return neighborPiece.color === piece.modifier;
        if (options.excludeBlack && neighborPiece.color === "black") return false;
        return true;
    }

    _getNeighborContext(q, r, piece, options = {}) {
        const validNeighbors = this.getNeighbors(q, r).filter(n => this.cellExists(n.q, n.r));
        const filledDirs = [];
        let filledCount = 0;

        for (const n of validNeighbors) {
            const np = this.getPiece(n.q, n.r);
            if (this._matchesNeighborFilter(piece, np, options)) {
                filledCount++;
                filledDirs.push(n.dir);
            }
        }

        return {
            validNeighbors,
            totalSlots: validNeighbors.length,
            filledCount,
            filledDirs,
        };
    }

    _areDirsConnected(filledDirs) {
        if (filledDirs.length === 0) return false;
        const indexSet = new Set(filledDirs.map(d => Game.DIR_ORDER.indexOf(d)).filter(i => i >= 0));
        if (indexSet.size !== filledDirs.length) return false;

        const visited = new Set();
        const start = [...indexSet][0];
        const stack = [start];

        while (stack.length > 0) {
            const idx = stack.pop();
            if (visited.has(idx)) continue;
            visited.add(idx);
            const left = (idx + 5) % 6;
            const right = (idx + 1) % 6;
            if (indexSet.has(left) && !visited.has(left)) stack.push(left);
            if (indexSet.has(right) && !visited.has(right)) stack.push(right);
        }

        return visited.size === indexSet.size;
    }

    _canRemoveByPieceRule(piece, q, r, allowGrayProxy = true) {
        if (piece.color === "white") {
            // If white has a modifier (e.g. modifier: 'red'), it is removable
            // when the hand contains no pieces of that modifier color.
            if (piece.modifier) {
                return this.hand.every(p => p.color !== piece.modifier);
            }
            // Default: removable only if hand contains only whites (or is empty).
            return this.hand.every(p => p.color === "white");
        }

        if (piece.color === "black") {
            const selfKey = `${q},${r}`;
            // If black has a modifier (e.g. modifier: 'red'), it becomes a
            // conditional-black: removable when there are no more pieces of
            // that modifier color left on the board.
            if (piece.modifier) {
                for (const [key, p] of this.board) {
                    if (key === selfKey) continue;
                    if (p.color === piece.modifier) return false;
                }
                return true;
            }
            // Default black behavior: removable only when all remaining pieces are black.
            for (const [key, p] of this.board) {
                if (key === selfKey) continue;
                if (p.color !== "black") return false;
            }
            return true;
        }

        if (piece.color === "gray") {
            if (!allowGrayProxy || !this.lastRemovedPiece) return false;
            const proxyPiece = {
                color: this.lastRemovedPiece.color,
                modifier: this.lastRemovedPiece.modifier || null,
            };
            if (proxyPiece.color === "gray") return false;
            return this._canRemoveByPieceRule(proxyPiece, q, r, false);
        }

        const excludeBlack = ["red", "blue", "green", "yellow", "purple"].includes(piece.color);
        const ctx = this._getNeighborContext(q, r, piece, { excludeBlack });

        switch (piece.color) {
            case "red":
                return ctx.filledCount >= 1 && ctx.filledCount < ctx.totalSlots;

            case "blue":
                return ctx.filledCount === 0;

            case "green":
                return ctx.filledCount >= 2 && this._areDirsConnected(ctx.filledDirs);

            case "orange":
                return ctx.totalSlots > 0 && ctx.filledCount === ctx.totalSlots;

            case "yellow":
                if (ctx.filledCount !== 3) return false;
                for (const dir of ctx.filledDirs) {
                    const opp = Game.OPPOSITES[dir];
                    if (ctx.filledDirs.includes(opp)) return false;
                }
                return true;

            case "purple":
                if (ctx.filledCount !== 2) return false;
                return ctx.filledDirs.length === 2 && Game.OPPOSITES[ctx.filledDirs[0]] === ctx.filledDirs[1];

            default:
                return false;
        }
    }

    // ===================== PIECE RULES =====================

    canRemove(q, r) {
        const piece = this.getPiece(q, r);
        if (!piece) return false;

        return this._canRemoveByPieceRule(piece, q, r, true);
    }

    removePiece(q, r) {
        const key = `${q},${r}`;
        const piece = this.board.get(key);
        if (!piece) return false;

        this.history.push({
            type: "remove", q, r,
            piece: { ...piece },
            handBefore: this.hand.map(p => ({ ...p })),
            movesBefore: this.moves,
            lastRemovedBefore: this.lastRemovedPiece ? { ...this.lastRemovedPiece } : null,
        });

        this.board.delete(key);
        // All removed pieces return to the hand (including black)
        this.hand.push({ ...piece });
        this.lastRemovedPiece = { color: piece.color, modifier: piece.modifier || null };
        this.moves++;

        if (this.moveLimit && this.moves > this.moveLimit) {
            this.moveLimitExceeded = true;
        }
        return true;
    }

    placePiece(q, r, handIndex) {
        if (!this.cellExists(q, r)) return false;
        if (this.board.has(`${q},${r}`)) return false;
        if (handIndex < 0 || handIndex >= this.hand.length) return false;

        const piece = this.hand[handIndex];

        this.history.push({
            type: "place", q, r,
            piece: { ...piece },
            handBefore: this.hand.map(p => ({ ...p })),
            movesBefore: this.moves,
            lastRemovedBefore: this.lastRemovedPiece ? { ...this.lastRemovedPiece } : null,
        });

        this.board.set(`${q},${r}`, { ...piece });
        this.hand.splice(handIndex, 1);
        this.selectedHandPiece = null;
        this.moves++;

        if (this.moveLimit && this.moves > this.moveLimit) {
            this.moveLimitExceeded = true;
        }
        return true;
    }

    undo() {
        if (this.history.length === 0) return false;
        const action = this.history.pop();

        if (action.type === "remove") {
            this.board.set(`${action.q},${action.r}`, { ...action.piece });
            this.hand = action.handBefore.map(p => ({ ...p }));
        } else if (action.type === "place") {
            this.board.delete(`${action.q},${action.r}`);
            this.hand = action.handBefore.map(p => ({ ...p }));
        }

        this.moves = action.movesBefore;
        this.lastRemovedPiece = action.lastRemovedBefore ? { ...action.lastRemovedBefore } : null;
        this.moveLimitExceeded = false;
        this.won = false;
        this.selectedHandPiece = null;
        return true;
    }

    checkWin() {
        if (this.board.size === 0) {
            // Check external win hook (e.g. for tutorial completion)
            if (this.onWinHook && !this.onWinHook()) return false;

            this.won = true;
            const isOfficialLevel = this.currentLevel
                && Number.isInteger(this.currentLevel.id)
                && !this.currentLevel.custom;
            if (isOfficialLevel) {
                this.save.completeLevel(this.currentLevel.id, this.moves);
            }
            return true;
        }
        return false;
    }

    // Returns info about a piece for tooltips
    getPieceInfo(q, r) {
        const piece = this.getPiece(q, r);
        if (!piece) return null;

        const rules = {
            red: { name: "Vermelha", rule: "Remove com 1+ vizinhas (exceto pretas), mas não todas." },
            blue: { name: "Azul", rule: "Remove só quando isolada (0 vizinhas, exceto pretas)." },
            green: { name: "Verde", rule: "Remove com 2+ vizinhas conectadas entre si (ignora pretas)." },
            orange: { name: "Laranja", rule: "Remove quando TODAS as casas adjacentes estão preenchidas." },
            yellow: { name: "Amarela", rule: "Remove com exatamente 3 vizinhas sem opostas (exceto pretas)." },
            purple: { name: "Roxa", rule: "Remove com exatamente 2 vizinhas opostas (exceto pretas)." },
            white: { name: "Branca", rule: "Remove só se não houver peças de outras cores na mão." },
            gray: { name: "Cinza", rule: "Copia regra e modificador da última peça removida." },
            black: { name: "Preta", rule: "Remove quando todas as outras peças forem removidas." },
        };

        const info = rules[piece.color] || { name: "?", rule: "" };
        const canRemove = this.canRemove(q, r);

        if (piece.modifier) {
            const modName = rules[piece.modifier]?.name || piece.modifier;
            if (piece.color === "gray") {
                info.rule += ` Mod: ao copiar, só conta vizinhas ${modName}s.`;
            } else if (piece.color === "white") {
                info.rule += ` Mod: removível se não houver ${modName}s na mão.`;
            } else if (piece.color === "black") {
                info.rule += ` Mod: removível quando não houver mais ${modName}s no tabuleiro.`;
            } else {
                info.rule += ` Mod: só conta vizinhas ${modName}s.`;
            }
        }

        return { ...info, canRemove, color: piece.color, modifier: piece.modifier };
    }
}
