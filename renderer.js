// renderer.js — Renderização do jogo no Canvas
// Classe Renderer com suporte a touch e melhor visual

class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;

    this.hexSize = 30;
    this.offsetX = 0;
    this.offsetY = 0;

    this.hoverHex = null;
    this.mouseX = 0;
    this.mouseY = 0;

    this.animations = [];
    this.hexCenters = new Map();
    this.dpr = window.devicePixelRatio || 1;

    // Paleta de cores atualizada
    this.colors = {
      background: '#0d1117',
      hexEmpty: 'rgba(33, 38, 45, 0.6)',
      hexEmptyBorder: 'rgba(48, 54, 61, 0.8)',
      red: '#e5534b',
      blue: '#388bfd',
      green: '#3fb950',
      yellow: '#d29922',
      gray: '#6e7681',
      canRemove: 'rgba(63, 185, 80, 0.5)',
      cantRemove: 'rgba(248, 81, 73, 0.35)',
      placeHighlight: 'rgba(63, 185, 80, 0.25)',
      placeDot: 'rgba(63, 185, 80, 0.6)'
    };

    this.resize();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  // ==========================================
  // Redimensionamento
  // ==========================================

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.displayWidth = rect.width;
    this.displayHeight = rect.height;

    if (!this.game.currentLevel) return;

    const cols = this.game.cols;
    const rows = this.game.rows;

    const maxWidth = this.displayWidth - 40;
    const maxHeight = this.displayHeight - 40;

    const sizeByWidth = maxWidth / (cols * 1.5 + 0.5);
    const sizeByHeight = maxHeight / ((rows + 0.5) * Math.sqrt(3));

    this.hexSize = Math.min(sizeByWidth, sizeByHeight, 50);
    this.hexSize = Math.max(this.hexSize, 18);

    const totalWidth = (cols * 1.5 + 0.5) * this.hexSize;
    const totalHeight = (rows + 0.5) * Math.sqrt(3) * this.hexSize;

    this.offsetX = (this.displayWidth - totalWidth) / 2 + this.hexSize;
    this.offsetY = (this.displayHeight - totalHeight) / 2 + this.hexSize * Math.sqrt(3) / 2;

    this._calculateHexCenters();
  }

  _calculateHexCenters() {
    this.hexCenters.clear();
    for (let r = 0; r < this.game.rows; r++) {
      for (let q = 0; q < this.game.cols; q++) {
        const key = `${q},${r}`;
        if (this.game.mask.get(key)) {
          const center = this._hexToPixel(q, r);
          this.hexCenters.set(key, center);
        }
      }
    }
  }

  // ==========================================
  // Coordenadas hex ↔ pixel
  // ==========================================

  _hexToPixel(q, r) {
    const size = this.hexSize;
    const x = this.offsetX + q * size * 1.5;
    const y = this.offsetY + r * size * Math.sqrt(3) + (q % 2 === 1 ? size * Math.sqrt(3) / 2 : 0);
    return { x, y };
  }

  pixelToHex(px, py) {
    let bestKey = null;
    let bestDist = Infinity;

    for (const [key, center] of this.hexCenters) {
      const dx = px - center.x;
      const dy = py - center.y;
      const dist = dx * dx + dy * dy;

      if (dist < bestDist) {
        bestDist = dist;
        bestKey = key;
      }
    }

    if (bestKey && bestDist < this.hexSize * this.hexSize * 1.1) {
      const [q, r] = bestKey.split(',').map(Number);
      if (this._pointInHex(px, py, this.hexCenters.get(bestKey))) {
        return { q, r };
      }
    }

    return null;
  }

  _pointInHex(px, py, center) {
    const size = this.hexSize;
    const dx = Math.abs(px - center.x);
    const dy = Math.abs(py - center.y);

    if (dx > size || dy > size * Math.sqrt(3) / 2) return false;
    return dy <= Math.sqrt(3) / 2 * (2 * size - 2 * dx);
  }

  // ==========================================
  // Conversão de coordenadas touch/mouse → canvas
  // ==========================================

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  }

  // ==========================================
  // Desenho
  // ==========================================

  _drawHex(cx, cy, size, fillColor, strokeColor, lineWidth = 2) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  _drawHexRounded(cx, cy, size, fillColor, strokeColor, lineWidth = 2) {
    const ctx = this.ctx;
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      corners.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle)
      });
    }

    const r = size * 0.08; // radius of rounding
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const curr = corners[i];
      const next = corners[(i + 1) % 6];
      const prev = corners[(i + 5) % 6];

      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      const p1x = curr.x - (dx1 / d1) * r;
      const p1y = curr.y - (dy1 / d1) * r;
      const p2x = curr.x + (dx2 / d2) * r;
      const p2y = curr.y + (dy2 / d2) * r;

      if (i === 0) ctx.moveTo(p1x, p1y);
      else ctx.lineTo(p1x, p1y);
      ctx.quadraticCurveTo(curr.x, curr.y, p2x, p2y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  _drawModifier(cx, cy, modifierColor) {
    const ctx = this.ctx;
    const radius = this.hexSize * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.colors[modifierColor] || modifierColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawPieceSymbol(cx, cy, piece) {
    const ctx = this.ctx;
    const size = this.hexSize;

    let symbol = '';
    switch (piece.color) {
      case 'red': symbol = 'R'; break;
      case 'blue': symbol = 'B'; break;
      case 'green': symbol = 'G'; break;
      case 'yellow': symbol = 'Y'; break;
      case 'gray': symbol = '▪'; break;
    }

    ctx.fillStyle = piece.color === 'yellow' ? '#1a1a1a' : '#ffffff';
    ctx.font = `bold ${Math.max(size * 0.48, 11)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (piece.modifier) {
      ctx.fillText(symbol, cx, cy - size * 0.12);
    } else {
      ctx.fillText(symbol, cx, cy);
    }
  }

  // ==========================================
  // Loop de renderização
  // ==========================================

  _animate() {
    this.draw();
    this._updateAnimations();
    requestAnimationFrame(this._animate);
  }

  draw() {
    const ctx = this.ctx;

    // Reset transform and clear
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);

    if (!this.game.currentLevel) return;

    for (let r = 0; r < this.game.rows; r++) {
      for (let q = 0; q < this.game.cols; q++) {
        const key = `${q},${r}`;
        if (!this.game.mask.get(key)) continue;

        const center = this.hexCenters.get(key);
        if (!center) continue;

        const piece = this.game.getPiece(q, r);
        const isHover = this.hoverHex && this.hoverHex.q === q && this.hoverHex.r === r;

        if (piece) {
          const fillColor = this.colors[piece.color] || '#888888';
          const alpha = this._getAnimationAlpha(key);

          if (alpha < 1) ctx.globalAlpha = alpha;

          // Draw piece hex with subtle shadow
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = this.hexSize * 0.15;
          ctx.shadowOffsetY = this.hexSize * 0.05;
          this._drawHexRounded(center.x, center.y, this.hexSize * 0.92, fillColor, 'rgba(0,0,0,0.2)', 1.5);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          // Inner highlight
          const grad = ctx.createRadialGradient(
            center.x - this.hexSize * 0.15, center.y - this.hexSize * 0.2,
            0,
            center.x, center.y,
            this.hexSize * 0.9
          );
          grad.addColorStop(0, 'rgba(255,255,255,0.15)');
          grad.addColorStop(1, 'rgba(0,0,0,0.1)');
          this._drawHexRounded(center.x, center.y, this.hexSize * 0.88, grad, 'transparent', 0);

          this._drawPieceSymbol(center.x, center.y, piece);

          if (piece.modifier) {
            this._drawModifier(center.x, center.y + this.hexSize * 0.22, piece.modifier);
          }

          ctx.globalAlpha = 1;

          // Hover highlight
          if (isHover && this.game.state === 'playing' && this.game.selectedHandPiece === null) {
            const canRemove = this.game.canRemove(q, r);
            const highlightColor = canRemove ? this.colors.canRemove : this.colors.cantRemove;
            this._drawHexRounded(center.x, center.y, this.hexSize * 0.95, 'transparent', highlightColor, 3);
          }
        } else {
          // Empty cell
          let emptyFill = this.colors.hexEmpty;
          let emptyBorder = this.colors.hexEmptyBorder;

          if (this.game.selectedHandPiece !== null && this.game.state === 'playing') {
            if (isHover && this.game.canPlaceAt(q, r)) {
              emptyFill = this.colors.placeHighlight;
              emptyBorder = 'rgba(63, 185, 80, 0.5)';
            }
          }

          this._drawHexRounded(center.x, center.y, this.hexSize * 0.92, emptyFill, emptyBorder, 1);

          // Placement dots
          if (this.game.selectedHandPiece !== null && this.game.canPlaceAt(q, r)) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, Math.max(3, this.hexSize * 0.08), 0, Math.PI * 2);
            ctx.fillStyle = this.colors.placeDot;
            ctx.fill();
          }
        }
      }
    }

    this._drawAnimations();
  }

  // ==========================================
  // Animações
  // ==========================================

  addFadeOut(q, r, piece) {
    const key = `${q},${r}`;
    const center = this.hexCenters.get(key);
    if (!center) return;

    this.animations.push({
      type: 'fadeOut',
      key,
      piece: { ...piece },
      cx: center.x,
      cy: center.y,
      startTime: performance.now(),
      duration: 250,
      alpha: 1
    });
  }

  addFadeIn(q, r) {
    const key = `${q},${r}`;
    this.animations.push({
      type: 'fadeIn',
      key,
      startTime: performance.now(),
      duration: 250
    });
  }

  _updateAnimations() {
    const now = performance.now();
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      return elapsed < anim.duration;
    });
  }

  _drawAnimations() {
    const ctx = this.ctx;
    const now = performance.now();

    for (const anim of this.animations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (anim.type === 'fadeOut') {
        const alpha = 1 - progress;
        const eased = 1 - Math.pow(progress, 2);
        ctx.globalAlpha = alpha;
        const fillColor = this.colors[anim.piece.color] || '#888';
        const scale = 1 + progress * 0.15;
        this._drawHexRounded(anim.cx, anim.cy, this.hexSize * 0.92 * scale, fillColor, 'rgba(0,0,0,0.2)', 1.5);
        this._drawPieceSymbol(anim.cx, anim.cy, anim.piece);
        if (anim.piece.modifier) {
          this._drawModifier(anim.cx, anim.cy + this.hexSize * 0.22, anim.piece.modifier);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  _getAnimationAlpha(key) {
    const now = performance.now();
    for (const anim of this.animations) {
      if (anim.type === 'fadeIn' && anim.key === key) {
        const elapsed = now - anim.startTime;
        const t = Math.min(elapsed / anim.duration, 1);
        return t * t * (3 - 2 * t); // smoothstep
      }
    }
    return 1;
  }

  // ==========================================
  // Hover
  // ==========================================

  updateHover(x, y) {
    this.mouseX = x;
    this.mouseY = y;
    this.hoverHex = this.pixelToHex(x, y);
  }

  clearHover() {
    this.hoverHex = null;
  }
}
