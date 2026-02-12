// editor.js — Level Editor for HexTatics
class Editor {
    constructor() {
        this.cols = 7;
        this.rows = 6;
        this.mask = [];
        this.pieces = new Map(); // "q,r" -> {color, modifier}
        this.tool = "red";       // red|blue|green|yellow|gray|eraser|toggle|modifier
        this.modifierColor = "red";
        this.name = "Minha Fase";
        this.moveLimit = null;
        this.par = null;
        this.active = false;
        this.editingId = null;   // id of custom level being edited
        this.customLevels = [];
        this.initGrid();
        this.loadCustomLevels();
    }

    initGrid() {
        this.mask = [];
        this.pieces = new Map();
        for (let r = 0; r < this.rows; r++) {
            this.mask[r] = [];
            for (let q = 0; q < this.cols; q++) {
                this.mask[r][q] = true;
            }
        }
    }

    resizeGrid(cols, rows) {
        cols = Math.max(2, Math.min(12, cols));
        rows = Math.max(2, Math.min(10, rows));
        const oldMask = this.mask;
        const oldPieces = new Map(this.pieces);
        this.cols = cols;
        this.rows = rows;
        this.mask = [];
        this.pieces = new Map();
        for (let r = 0; r < this.rows; r++) {
            this.mask[r] = [];
            for (let q = 0; q < this.cols; q++) {
                this.mask[r][q] = (oldMask[r] && oldMask[r][q] !== undefined) ? oldMask[r][q] : true;
                const key = `${q},${r}`;
                if (oldPieces.has(key) && this.mask[r][q]) {
                    this.pieces.set(key, oldPieces.get(key));
                }
            }
        }
    }

    cellValid(q, r) {
        return q >= 0 && q < this.cols && r >= 0 && r < this.rows;
    }

    handleClick(q, r) {
        if (!this.cellValid(q, r)) return;
        const key = `${q},${r}`;

        if (this.tool === "toggle") {
            this.mask[r][q] = !this.mask[r][q];
            if (!this.mask[r][q]) this.pieces.delete(key);
            return;
        }
        if (!this.mask[r][q]) return;
        if (this.tool === "eraser") {
            this.pieces.delete(key);
            return;
        }
        if (this.tool === "modifier") {
            const piece = this.pieces.get(key);
            if (piece) {
                piece.modifier = (piece.modifier === this.modifierColor) ? null : this.modifierColor;
            }
            return;
        }
        // Place or toggle piece
        const existing = this.pieces.get(key);
        if (existing && existing.color === this.tool) {
            this.pieces.delete(key);
        } else {
            this.pieces.set(key, { color: this.tool, modifier: null });
        }
    }

    clear() {
        this.pieces = new Map();
        for (let r = 0; r < this.rows; r++) {
            for (let q = 0; q < this.cols; q++) {
                this.mask[r][q] = true;
            }
        }
    }

    reset() {
        this.name = "Minha Fase";
        this.moveLimit = null;
        this.par = null;
        this.editingId = null;
        this.cols = 7;
        this.rows = 6;
        this.initGrid();
    }

    getPieceCount() {
        return this.pieces.size;
    }

    toLevel(id) {
        const pieces = [];
        for (const [key, piece] of this.pieces) {
            const [q, r] = key.split(",").map(Number);
            const p = { q, r, color: piece.color };
            if (piece.modifier) p.modifier = piece.modifier;
            pieces.push(p);
        }
        return {
            id: id || "custom_test",
            name: this.name || "Fase Personalizada",
            category: "Personalizada",
            description: "Fase criada pelo jogador",
            gridSize: { cols: this.cols, rows: this.rows },
            moveLimit: this.moveLimit,
            par: this.par || Math.max(1, pieces.length),
            mask: this.mask.map(row => [...row]),
            pieces,
            custom: true,
        };
    }

    loadFromLevel(level) {
        this.name = level.name || "Minha Fase";
        this.cols = level.gridSize.cols;
        this.rows = level.gridSize.rows;
        this.moveLimit = level.moveLimit;
        this.par = level.par;
        this.mask = level.mask.map(row => [...row]);
        this.pieces = new Map();
        for (const p of level.pieces) {
            this.pieces.set(`${p.q},${p.r}`, { color: p.color, modifier: p.modifier || null });
        }
    }

    exportJSON() {
        const level = this.toLevel();
        delete level.id; delete level.category; delete level.custom;
        return JSON.stringify(level);
    }

    importJSON(json) {
        try {
            const level = JSON.parse(json);
            if (!level.gridSize || !level.pieces || !level.mask) return false;
            this.loadFromLevel(level);
            return true;
        } catch { return false; }
    }

    saveCustomLevel() {
        if (this.editingId) {
            const idx = this.customLevels.findIndex(l => l.id === this.editingId);
            if (idx >= 0) {
                this.customLevels[idx] = this.toLevel(this.editingId);
                this._persist();
                return this.customLevels[idx];
            }
        }
        const id = `custom_${Date.now()}`;
        const level = this.toLevel(id);
        this.editingId = id;
        this.customLevels.push(level);
        this._persist();
        return level;
    }

    deleteCustomLevel(id) {
        this.customLevels = this.customLevels.filter(l => l.id !== id);
        this._persist();
    }

    loadCustomLevels() {
        try {
            const data = localStorage.getItem("hextatics_custom");
            this.customLevels = data ? JSON.parse(data) : [];
        } catch { this.customLevels = []; }
    }

    _persist() {
        localStorage.setItem("hextatics_custom", JSON.stringify(this.customLevels));
    }
}
