// renderer.js — Renderizador Canvas para HexTatics
// Hexágonos flat-top, odd-q offset. Suporte a touch, tooltips, partículas.

class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.game = game;

        // Layout (recalculado em _resize)
        this.hexSize = 36; // "raio" do hex (centro à ponta)
        this.offsetX = 0;
        this.offsetY = 0;

        // Estado de interação
        this.hoveredCell = null;
        this.placementMode = false;
        this.tutorialTarget = null;
        this.animations = new Map();
        this.particles = [];

        this._resize();
    }

    // ===================== LAYOUT =====================

    _resize() {
        const area = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = area.clientWidth;
        const h = area.clientHeight;

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.displayWidth = w;
        this.displayHeight = h;

        this._computeLayout();
    }

    _computeLayout() {
        const g = this.game;
        if (!g.gridSize || g.gridSize.cols === 0) return;

        const { cols, rows } = g.gridSize;
        const baseSize = 36;

        // Flat-top hex:
        //   width = 2 * size (ponta a ponta horizontal)
        //   height = sqrt(3) * size (flat edge to flat edge vertical)
        //   horiz spacing = 3/2 * size between column centers
        //   vert spacing = sqrt(3) * size between row centers
        //   odd columns shifted down by sqrt(3)/2 * size

        const gridW = (cols - 1) * (3 / 2 * baseSize) + 2 * baseSize;
        const gridH = rows * (Math.sqrt(3) * baseSize) + (Math.sqrt(3) / 2 * baseSize);

        // Fit to screen with padding
        const padX = 30;
        const padY = 30;

        let topInset = 0;
        let bottomInset = 0;
        const isMobile = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
        const tutorialActive = document.body.classList.contains("tutorial-active");

        if (isMobile && tutorialActive) {
            const tutorialEl = document.getElementById("tutorial-wizard");
            const handEl = document.getElementById("hand-area");
            if (tutorialEl && tutorialEl.style.display !== "none") {
                bottomInset += tutorialEl.getBoundingClientRect().height + 16;
            }
            if (handEl && handEl.style.display !== "none") {
                bottomInset += handEl.getBoundingClientRect().height + 12;
            }
            topInset = 4;
        }

        const usableWidth = Math.max(this.displayWidth, 120);
        const usableHeight = Math.max(this.displayHeight - topInset - bottomInset, 120);
        const scaleX = (usableWidth - padX * 2) / gridW;
        const scaleY = (usableHeight - padY * 2) / gridH;
        const scale = Math.min(scaleX, scaleY, 1.8);

        this.hexSize = baseSize * scale;

        // Recompute grid dimensions with actual size
        const size = this.hexSize;
        const actualGridW = (cols - 1) * (3 / 2 * size) + 2 * size;
        const actualGridH = rows * (Math.sqrt(3) * size) + (Math.sqrt(3) / 2 * size);

        this.offsetX = (usableWidth - actualGridW) / 2 + size;
        this.offsetY = topInset + (usableHeight - actualGridH) / 2 + (Math.sqrt(3) / 2 * size);
    }

    // ===================== HEX MATH =====================
    // Flat-top, odd-q offset:
    //   x = size * 3/2 * q
    //   y = sqrt(3) * size * (r + 0.5 * (q & 1))

    hexToPixel(q, r) {
        const size = this.hexSize;
        const x = this.offsetX + size * 1.5 * q;
        const y = this.offsetY + Math.sqrt(3) * size * (r + 0.5 * (q & 1));
        return { x, y };
    }

    pixelToHex(px, py) {
        const game = this.game;
        let closest = null;
        let minDist = Infinity;

        for (let r = 0; r < game.gridSize.rows; r++) {
            for (let q = 0; q < game.gridSize.cols; q++) {
                if (!game.cellExists(q, r)) continue;
                const { x, y } = this.hexToPixel(q, r);
                const dx = px - x, dy = py - y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist && dist < this.hexSize * this.hexSize * 1.2) {
                    minDist = dist;
                    closest = { q, r };
                }
            }
        }
        return closest;
    }

    // ===================== DRAWING =====================

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);

        const game = this.game;
        if (!game.gridSize || game.gridSize.cols === 0) return;

        this._updateParticles();

        // Draw cells
        for (let r = 0; r < game.gridSize.rows; r++) {
            for (let q = 0; q < game.gridSize.cols; q++) {
                if (!game.cellExists(q, r)) continue;
                this._drawCell(q, r);
            }
        }

        // Draw particles on top
        this._drawParticles();
    }

    _drawCell(q, r) {
        const ctx = this.ctx;
        const { x, y } = this.hexToPixel(q, r);
        const size = this.hexSize;
        const piece = this.game.getPiece(q, r);
        const isHovered = this.hoveredCell && this.hoveredCell.q === q && this.hoveredCell.r === r;
        const isTutorialTarget = this.tutorialTarget && this.tutorialTarget.q === q && this.tutorialTarget.r === r;
        const anim = this.animations.get(`${q},${r}`);

        // Animation alpha
        let alpha = 1;
        if (anim) {
            const progress = (Date.now() - anim.start) / anim.duration;
            if (progress >= 1) {
                this.animations.delete(`${q},${r}`);
            } else if (anim.type === "fadeOut") {
                alpha = 1 - progress;
            } else if (anim.type === "fadeIn") {
                alpha = progress;
            }
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Hex background
        this._drawHexPath(x, y, size);

        if (piece) {
            // Piece colors
            const colors = {
                red: "#CC2222", blue: "#2244BB", green: "#1D8C1D",
                orange: "#E67E22", yellow: "#CCAA00", purple: "#9933CC",
                white: "#EDEDED", gray: "#777777", black: "#111111",
            };
            const isRemovable = isHovered && !this.game.won ? this.game.canRemove(q, r) : false;

            ctx.fillStyle = colors[piece.color] || "#555";
            ctx.fill();

            if (isHovered) {
                // Hover: bright border + glow
                ctx.strokeStyle = isRemovable ? "#00ff88" : "#ff4444";
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.save();
                ctx.shadowColor = isRemovable ? "#00ff88" : "#ff4444";
                ctx.shadowBlur = 15;
                this._drawHexPath(x, y, size);
                ctx.stroke();
                ctx.restore();
            } else if (isTutorialTarget && !this.game.won) {
                const pulse = 0.45 + 0.25 * Math.sin(Date.now() / 400);
                ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.save();
                ctx.shadowColor = "rgba(255, 215, 0, 0.9)";
                ctx.shadowBlur = 18;
                this._drawHexPath(x, y, size);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.strokeStyle = "rgba(255,255,255,0.12)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Piece symbol
            ctx.fillStyle = piece.color === "white" ? "rgba(20,20,20,0.9)" : "rgba(255,255,255,0.85)";
            ctx.font = `bold ${Math.max(size * 0.45, 10)}px 'Segoe UI', system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const symbols = {
                red: "♦", blue: "●", green: "■", orange: "⬟", yellow: "▲",
                purple: "✦", white: "◉", gray: "▬", black: "⬢"
            };
            ctx.fillText(symbols[piece.color] || "?", x, y);

            if (piece.color === "gray") {
                const copied = this.game.lastRemovedPiece;
                if (copied && copied.color && copied.color !== "gray") {
                    const badgeColors = {
                        red: "#CC2222", blue: "#2244BB", green: "#1D8C1D",
                        orange: "#E67E22", yellow: "#CCAA00", purple: "#9933CC",
                        white: "#EDEDED", gray: "#777777", black: "#111111",
                    };
                    const modColors = {
                        red: "#FF4444", blue: "#4488FF", green: "#44DD44",
                        orange: "#FF9E3D", yellow: "#FFDD44", purple: "#BB66FF",
                        white: "#FFFFFF", gray: "#AAAAAA", black: "#222222",
                    };

                    const badgeR = Math.max(size * 0.20, 6);
                    const badgeX = x - size * 0.34;
                    const badgeY = y + size * 0.30;

                    ctx.beginPath();
                    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
                    ctx.fillStyle = badgeColors[copied.color] || "#555";
                    ctx.fill();
                    ctx.strokeStyle = "rgba(0,0,0,0.55)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = copied.color === "white" ? "rgba(20,20,20,0.9)" : "rgba(255,255,255,0.92)";
                    ctx.font = `bold ${Math.max(size * 0.24, 8)}px 'Segoe UI', system-ui, sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(symbols[copied.color] || "?", badgeX, badgeY + 0.5);

                    if (copied.modifier) {
                        const dotR = Math.max(size * 0.075, 2.5);
                        ctx.beginPath();
                        ctx.arc(badgeX + badgeR * 0.62, badgeY - badgeR * 0.62, dotR, 0, Math.PI * 2);
                        ctx.fillStyle = modColors[copied.modifier] || "#fff";
                        ctx.fill();
                        ctx.strokeStyle = "#000";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Modifier dot
            if (piece.modifier) {
                const modColors = {
                    red: "#FF4444", blue: "#4488FF", green: "#44DD44",
                    orange: "#FF9E3D", yellow: "#FFDD44", purple: "#BB66FF",
                    white: "#FFFFFF", gray: "#AAAAAA", black: "#222222",
                };
                const dotR = Math.max(size * 0.16, 4);
                ctx.beginPath();
                ctx.arc(x + size * 0.35, y - size * 0.35, dotR, 0, Math.PI * 2);
                ctx.fillStyle = modColors[piece.modifier] || "#fff";
                ctx.fill();
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        } else {
            // Empty cell
            if ((this.placementMode && isHovered) || isTutorialTarget) {
                ctx.fillStyle = "rgba(0, 255, 136, 0.12)";
                ctx.fill();
                ctx.strokeStyle = isTutorialTarget ? "rgba(255, 215, 0, 0.6)" : "rgba(0, 255, 136, 0.4)";
                ctx.lineWidth = isTutorialTarget ? 3 : 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // Flat-top hexagon: first vertex at 0° (right), going counter-clockwise
    _drawHexPath(x, y, size) {
        const ctx = this.ctx;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i; // 0, 60, 120, 180, 240, 300 degrees
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    // ===================== ANIMATIONS =====================

    addAnimation(q, r, type, duration) {
        this.animations.set(`${q},${r}`, {
            type, duration, start: Date.now(),
        });
    }

    // ===================== PARTICLES =====================

    spawnRemoveParticles(q, r, color) {
        const { x, y } = this.hexToPixel(q, r);
        const colors = {
            red: "#ff4444", blue: "#4488ff", green: "#44dd44",
            orange: "#ff9e3d", yellow: "#ffdd44", purple: "#bb66ff",
            white: "#f3f3f3", gray: "#aaaaaa", black: "#333333",
        };
        const c = colors[color] || "#ffffff";

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
            const speed = 1.5 + Math.random() * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: c,
            });
        }
    }

    _updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    _drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ==================== EDITOR RENDERING ====================

    drawEditor(editor, hoveredCell) {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const w = this.displayWidth;
        const h = this.displayHeight;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Background with subtle grid
        ctx.fillStyle = "#0a0a18";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(15,52,96,0.12)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

        // Compute hex layout
        const cols = editor.cols, rows = editor.rows;
        const gridW = 1.5 * (cols - 1) + 2;
        const gridH = Math.sqrt(3) * (rows + 0.5);
        const pad = 20;
        const hexSize = Math.min((w - 2 * pad) / gridW, (h - 2 * pad) / gridH, 45);

        const totalW = gridW * hexSize;
        const totalH = gridH * hexSize;
        const ox = (w - totalW) / 2 + hexSize;
        const oy = (h - totalH) / 2 + hexSize * Math.sqrt(3) / 2;

        this._editorHexSize = hexSize;
        this._editorOX = ox;
        this._editorOY = oy;

        const COLORS = {
            red: "#DD2222", blue: "#2244CC", green: "#22AA22", orange: "#E67E22",
            yellow: "#EECC00", purple: "#9933CC", white: "#F2F2F2", gray: "#999999", black: "#111111"
        };
        const SYMBOLS = {
            red: "♦", blue: "●", green: "■", orange: "⬟", yellow: "▲",
            purple: "✦", white: "◉", gray: "▬", black: "⬢"
        };

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const x = ox + hexSize * 1.5 * q;
                const y = oy + hexSize * Math.sqrt(3) * (r + 0.5 * (q & 1));
                const isMasked = !editor.mask[r] || !editor.mask[r][q];
                const key = `${q},${r}`;
                const piece = editor.pieces.get(key);
                const isHov = hoveredCell && hoveredCell.q === q && hoveredCell.r === r;

                this._drawHexPath(x, y, hexSize - 2);

                // Fill
                if (isMasked) {
                    ctx.fillStyle = "rgba(10,10,20,0.85)";
                } else if (piece) {
                    const c = COLORS[piece.color] || "#666";
                    ctx.fillStyle = isHov ? c + "cc" : c + "99";
                } else {
                    ctx.fillStyle = isHov ? "rgba(0,255,136,0.12)" : "rgba(26,26,62,0.5)";
                }
                ctx.fill();

                // Border
                ctx.strokeStyle = isHov ? "#00ff88" : (isMasked ? "rgba(30,30,60,0.5)" : "#0f3460");
                ctx.lineWidth = isHov ? 2.5 : 1;
                ctx.stroke();

                // Piece symbol
                if (piece && !isMasked) {
                    ctx.fillStyle = "rgba(255,255,255,0.85)";
                    ctx.font = `bold ${hexSize * 0.45}px system-ui`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    const sy = piece.modifier ? y - hexSize * 0.1 : y;
                    ctx.fillText(SYMBOLS[piece.color] || "?", x, sy);

                    // Modifier dot
                    if (piece.modifier) {
                        const dotY = y + hexSize * 0.25;
                        ctx.beginPath();
                        ctx.arc(x, dotY, hexSize * 0.15, 0, Math.PI * 2);
                        ctx.fillStyle = COLORS[piece.modifier];
                        ctx.fill();
                        ctx.strokeStyle = "#000";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }

                // Coord label (small, dimmed)
                if (!isMasked) {
                    ctx.fillStyle = "rgba(255,255,255,0.12)";
                    ctx.font = `${Math.max(8, hexSize * 0.2)}px system-ui`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    ctx.fillText(`${q},${r}`, x, y + hexSize * Math.sqrt(3) / 2 - 2);
                }
            }
        }
    }

    editorPixelToHex(px, py, editor) {
        const s = this._editorHexSize;
        const ox = this._editorOX;
        const oy = this._editorOY;
        if (!s) return null;

        let closest = null;
        let minDist = Infinity;
        for (let r = 0; r < editor.rows; r++) {
            for (let q = 0; q < editor.cols; q++) {
                const x = ox + s * 1.5 * q;
                const y = oy + s * Math.sqrt(3) * (r + 0.5 * (q & 1));
                const d = Math.hypot(px - x, py - y);
                if (d < minDist && d < s * 0.9) {
                    minDist = d;
                    closest = { q, r };
                }
            }
        }
        return closest;
    }
}
