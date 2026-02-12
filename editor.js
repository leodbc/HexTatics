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
        const colorCounts = {};
        for (const [key, piece] of this.pieces) {
            const [q, r] = key.split(",").map(Number);
            const p = { q, r, color: piece.color };
            if (piece.modifier) p.modifier = piece.modifier;
            pieces.push(p);
            colorCounts[piece.color] = (colorCounts[piece.color] || 0) + 1;
        }
        // Auto-generate description from piece breakdown
        const colorEmoji = { red: "♦", blue: "●", green: "■", yellow: "▲", purple: "✦", gray: "▬" };
        const desc = Object.entries(colorCounts).map(([c, n]) => `${n}${colorEmoji[c] || "?"}`).join(" ") || "Vazia";
        const hasModifiers = pieces.some(p => p.modifier);
        const hasHoles = this.mask.some(row => row.some(v => !v));
        const tags = [];
        if (hasModifiers) tags.push("🔄");
        if (hasHoles) tags.push("🕳️");
        if (this.moveLimit) tags.push("⏳");
        const description = desc + (tags.length ? " · " + tags.join("") : "");
        return {
            id: id || "custom_test",
            name: this.name || "Fase Personalizada",
            category: "Personalizada",
            description,
            gridSize: { cols: this.cols, rows: this.rows },
            moveLimit: this.moveLimit,
            par: this.par || Math.max(1, pieces.length),
            mask: this.mask.map(row => [...row]),
            pieces,
            custom: true,
            pieceCount: pieces.length,
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

    exportCode() {
        const level = this.toLevel();
        const colorKey = { red: "r", blue: "b", green: "g", yellow: "y", purple: "p", gray: "x" };
        const maskStr = level.mask.map(row => row.map(v => v ? "1" : "0").join("")).join(",");
        const piecesStr = level.pieces.map(p => {
            let s = colorKey[p.color] + p.q + "." + p.r;
            if (p.modifier) s += colorKey[p.modifier];
            return s;
        }).join(";");
        const data = [
            level.name,
            level.gridSize.cols + "x" + level.gridSize.rows,
            level.moveLimit || 0,
            level.par,
            maskStr,
            piecesStr
        ].join("|");
        return "HEX-" + btoa(unescape(encodeURIComponent(data)));
    }

    importCode(input) {
        input = input.trim();
        // Try compact code first
        if (input.startsWith("HEX-")) {
            try {
                const data = decodeURIComponent(escape(atob(input.slice(4))));
                const parts = data.split("|");
                if (parts.length < 6) return false;
                const keyColor = { r: "red", b: "blue", g: "green", y: "yellow", p: "purple", x: "gray" };
                const [name, size, limit, par, maskStr, piecesStr] = parts;
                const [cols, rows] = size.split("x").map(Number);
                const mask = maskStr.split(",").map(row => row.split("").map(c => c === "1"));
                const pieces = piecesStr.split(";").filter(Boolean).map(s => {
                    const color = keyColor[s[0]];
                    const rest = s.slice(1);
                    const dotIdx = rest.indexOf(".");
                    const afterDot = rest.slice(dotIdx + 1);
                    const modChar = afterDot.match(/[rbgyxp]$/);
                    const q = parseInt(rest.slice(0, dotIdx));
                    const r = parseInt(modChar ? afterDot.slice(0, -1) : afterDot);
                    const p = { q, r, color };
                    if (modChar) p.modifier = keyColor[modChar[0]];
                    return p;
                });
                this.loadFromLevel({
                    name, gridSize: { cols, rows },
                    moveLimit: parseInt(limit) || null,
                    par: parseInt(par),
                    mask, pieces
                });
                return true;
            } catch { return false; }
        }
        // Fallback: try JSON
        try {
            const level = JSON.parse(input);
            if (!level.gridSize || !level.pieces || !level.mask) return false;
            this.loadFromLevel(level);
            return true;
        } catch { return false; }
    }

    saveCustomLevel() {
        const now = new Date().toISOString();
        if (this.editingId) {
            const idx = this.customLevels.findIndex(l => l.id === this.editingId);
            if (idx >= 0) {
                const createdAt = this.customLevels[idx].createdAt || now;
                this.customLevels[idx] = { ...this.toLevel(this.editingId), createdAt, updatedAt: now };
                this._persist();
                return this.customLevels[idx];
            }
        }
        const id = `custom_${Date.now()}`;
        const level = { ...this.toLevel(id), createdAt: now, updatedAt: now };
        this.editingId = id;
        this.customLevels.push(level);
        this._persist();
        return level;
    }

    deleteCustomLevel(id) {
        this.customLevels = this.customLevels.filter(l => l.id !== id);
        this._persist();
    }

    duplicateCustomLevel(id) {
        const original = this.customLevels.find(l => l.id === id);
        if (!original) return null;
        const newId = `custom_${Date.now()}`;
        const now = new Date().toISOString();
        const dup = { ...JSON.parse(JSON.stringify(original)), id: newId, name: original.name + " (cópia)", createdAt: now, updatedAt: now };
        this.customLevels.push(dup);
        this._persist();
        return dup;
    }

    static codeFromLevel(level) {
        const colorKey = { red: "r", blue: "b", green: "g", yellow: "y", purple: "p", gray: "x" };
        const maskStr = level.mask.map(row => row.map(v => v ? "1" : "0").join("")).join(",");
        const piecesStr = level.pieces.map(p => {
            let s = colorKey[p.color] + p.q + "." + p.r;
            if (p.modifier) s += colorKey[p.modifier];
            return s;
        }).join(";");
        const data = [level.name, level.gridSize.cols + "x" + level.gridSize.rows, level.moveLimit || 0, level.par, maskStr, piecesStr].join("|");
        return "HEX-" + btoa(unescape(encodeURIComponent(data)));
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
