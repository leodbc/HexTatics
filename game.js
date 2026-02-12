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

    isUnlocked(levelId) {
        if (levelId === 1) return true;
        // Unlock next level when previous is completed
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

    // ===================== PIECE RULES =====================

    canRemove(q, r) {
        const piece = this.getPiece(q, r);
        if (!piece) return false;

        const neighbors = this.getNeighbors(q, r);

        // Gray piece logic
        if (piece.color === "gray") {
            if (piece.modifier) {
                // Gray with modifier: removable when no pieces of modifier color remain
                for (const [, p] of this.board) {
                    if (p.color === piece.modifier) return false;
                }
                return true;
            }
            // Plain gray: only removable when no non-gray pieces remain
            for (const [, p] of this.board) {
                if (p.color !== "gray") return false;
            }
            return true;
        }

        // Valid neighbors (exist on board and have cells)
        const validNeighbors = neighbors.filter(n => this.cellExists(n.q, n.r));

        // Count filled neighbors
        let filledCount = 0;
        let totalSlots = 0;
        const filledDirs = [];

        for (const n of validNeighbors) {
            const np = this.getPiece(n.q, n.r);
            // Skip gray neighbors only when no modifier targets gray
            if (np && np.color === "gray" && piece.modifier !== "gray") continue;

            totalSlots++;
            if (np) {
                // If modifier active, only count matching color
                if (piece.modifier && np.color !== piece.modifier) continue;
                filledCount++;
                filledDirs.push(n.dir);
            }
        }

        switch (piece.color) {
            case "red":
                return filledCount >= 1 && filledCount < totalSlots;

            case "blue":
                return filledCount === 0;

            case "green":
                return totalSlots > 0 && filledCount === totalSlots;

            case "yellow":
                if (filledCount !== 3) return false;
                for (const dir of filledDirs) {
                    const opp = Game.OPPOSITES[dir];
                    if (filledDirs.includes(opp)) return false;
                }
                return true;

            default:
                return false;
        }
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
        });

        this.board.delete(key);
        if (piece.color !== "gray") {
            this.hand.push({ ...piece });
        }
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
        this.moveLimitExceeded = false;
        this.won = false;
        this.selectedHandPiece = null;
        return true;
    }

    checkWin() {
        if (this.board.size === 0) {
            this.won = true;
            if (this.currentLevel) {
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
            red: { name: "Vermelha", rule: "Remove com 1+ vizinhas (não todas)." },
            blue: { name: "Azul", rule: "Remove só quando isolada (0 vizinhas)." },
            green: { name: "Verde", rule: "Remove só com TODAS vizinhas preenchidas." },
            yellow: { name: "Amarela", rule: "Remove com exatamente 3 vizinhas sem opostas." },
            gray: { name: "Cinza", rule: "Remove só quando sobrar apenas cinzas." },
        };

        const info = rules[piece.color] || { name: "?", rule: "" };
        const canRemove = this.canRemove(q, r);

        if (piece.modifier) {
            const modName = rules[piece.modifier]?.name || piece.modifier;
            if (piece.color === "gray") {
                info.rule = `Remove quando todas as ${modName}s forem removidas.`;
            } else {
                info.rule += ` Mod: só conta vizinhas ${modName}s.`;
            }
        }

        return { ...info, canRemove, color: piece.color, modifier: piece.modifier };
    }
}
