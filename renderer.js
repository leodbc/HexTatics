// renderer.js — Renderização do jogo no Canvas
// Classe Renderer responsável por desenhar hexágonos, peças, animações e detectar cliques

class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;

    // Tamanho do hexágono (raio do circumscribed circle)
    this.hexSize = 30;
    // Offset para centralizar o tabuleiro
    this.offsetX = 0;
    this.offsetY = 0;

    // Estado de hover
    this.hoverHex = null; // {q, r} da casa sobre mouse
    this.mouseX = 0;
    this.mouseY = 0;

    // Animações ativas
    this.animations = [];

    // Última posição calculada de cada hex (cache para detecção de cliques)
    this.hexCenters = new Map();

    // Cores do jogo (paleta)
    this.colors = {
      background: '#1a1a2e',
      hexEmpty: '#f0f0f0',
      hexBorder: '#333333',
      red: '#DD2222',
      blue: '#2244CC',
      green: '#22AA22',
      yellow: '#EECC00',
      gray: '#999999',
      victory: '#00ff88',
      canRemove: 'rgba(34, 170, 34, 0.5)',
      cantRemove: 'rgba(221, 34, 34, 0.4)',
      placeHighlight: 'rgba(0, 255, 136, 0.3)'
    };

    // Inicializar tamanho
    this.resize();

    // Iniciar loop de renderização
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  // ==========================================
  // Redimensionamento e cálculo de tamanho
  // ==========================================

  /**
   * Recalcula o tamanho dos hexágonos para caber no canvas
   */
  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    // Obter tamanho disponível
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    if (!this.game.currentLevel) return;

    const cols = this.game.cols;
    const rows = this.game.rows;

    // Calcular tamanho máximo que cabe no canvas
    // Para flat-top hexágonos:
    // Largura total ≈ cols * 1.5 * size + 0.5 * size
    // Altura total ≈ (rows + 0.5) * sqrt(3) * size
    const maxWidth = this.canvas.width - 40;
    const maxHeight = this.canvas.height - 40;

    const sizeByWidth = maxWidth / (cols * 1.5 + 0.5);
    const sizeByHeight = maxHeight / ((rows + 0.5) * Math.sqrt(3));

    this.hexSize = Math.min(sizeByWidth, sizeByHeight, 45);
    this.hexSize = Math.max(this.hexSize, 15); // Mínimo

    // Calcular offset para centralizar
    const totalWidth = (cols * 1.5 + 0.5) * this.hexSize;
    const totalHeight = (rows + 0.5) * Math.sqrt(3) * this.hexSize;

    this.offsetX = (this.canvas.width - totalWidth) / 2 + this.hexSize;
    this.offsetY = (this.canvas.height - totalHeight) / 2 + this.hexSize * Math.sqrt(3) / 2;

    // Recalcular centros dos hexágonos
    this._calculateHexCenters();
  }

  /**
   * Calcula e armazena em cache os centros de todos os hexágonos
   */
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
  // Conversão de coordenadas hex ↔ pixel
  // ==========================================

  /**
   * Converte coordenadas hex (q, r) para pixel (centro do hexágono)
   * Layout flat-top, offset odd-q
   */
  _hexToPixel(q, r) {
    const size = this.hexSize;
    const x = this.offsetX + q * size * 1.5;
    const y = this.offsetY + r * size * Math.sqrt(3) + (q % 2 === 1 ? size * Math.sqrt(3) / 2 : 0);
    return { x, y };
  }

  /**
   * Converte coordenadas pixel para hex (q, r) — detecção de clique
   * Retorna {q, r} da casa mais próxima, ou null se fora do tabuleiro
   */
  pixelToHex(px, py) {
    // Encontrar a casa hexagonal mais próxima pelo ponto
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

    // Verificar se o ponto está realmente dentro do hexágono
    if (bestKey && bestDist < this.hexSize * this.hexSize * 1.1) {
      const [q, r] = bestKey.split(',').map(Number);
      if (this._pointInHex(px, py, this.hexCenters.get(bestKey))) {
        return { q, r };
      }
    }

    return null;
  }

  /**
   * Verifica se um ponto está dentro de um hexágono (flat-top)
   */
  _pointInHex(px, py, center) {
    const size = this.hexSize;
    const dx = Math.abs(px - center.x);
    const dy = Math.abs(py - center.y);

    // Teste rápido com bounding box
    if (dx > size || dy > size * Math.sqrt(3) / 2) return false;

    // Teste exato: o hexágono flat-top tem lados inclinados
    // A borda inclinada satisfaz: dy <= sqrt(3) * (size - dx)
    return dy <= Math.sqrt(3) / 2 * (2 * size - 2 * dx);
  }

  // ==========================================
  // Desenho de hexágonos
  // ==========================================

  /**
   * Desenha um hexágono flat-top
   */
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

  /**
   * Desenha o modificador de cor (pequeno círculo no centro)
   */
  _drawModifier(cx, cy, modifierColor) {
    const ctx = this.ctx;
    const radius = this.hexSize * 0.28;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.colors[modifierColor] || modifierColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /**
   * Desenha uma letra/símbolo no centro do hexágono para identificar o tipo
   */
  _drawPieceSymbol(cx, cy, piece) {
    const ctx = this.ctx;
    const size = this.hexSize;

    // Símbolo baseado na cor da peça
    let symbol = '';
    switch (piece.color) {
      case 'red': symbol = 'R'; break;
      case 'blue': symbol = 'B'; break;
      case 'green': symbol = 'G'; break;
      case 'yellow': symbol = 'Y'; break;
      case 'gray': symbol = '▪'; break;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(size * 0.5, 10)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Se tem modificador, desenhar o símbolo um pouco acima
    if (piece.modifier) {
      ctx.fillText(symbol, cx, cy - size * 0.15);
    } else {
      ctx.fillText(symbol, cx, cy);
    }
  }

  // ==========================================
  // Loop de renderização principal
  // ==========================================

  /**
   * Loop de animação com requestAnimationFrame
   */
  _animate() {
    this.draw();
    this._updateAnimations();
    requestAnimationFrame(this._animate);
  }

  /**
   * Desenha todo o jogo
   */
  draw() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.game.currentLevel) return;

    // Desenhar todas as casas do tabuleiro
    for (let r = 0; r < this.game.rows; r++) {
      for (let q = 0; q < this.game.cols; q++) {
        const key = `${q},${r}`;
        if (!this.game.mask.get(key)) continue;

        const center = this.hexCenters.get(key);
        if (!center) continue;

        const piece = this.game.getPiece(q, r);
        const isHover = this.hoverHex && this.hoverHex.q === q && this.hoverHex.r === r;

        if (piece) {
          // Casa com peça
          const fillColor = this.colors[piece.color] || '#888888';
          const alpha = this._getAnimationAlpha(key);

          if (alpha < 1) {
            ctx.globalAlpha = alpha;
          }

          this._drawHex(center.x, center.y, this.hexSize * 0.95, fillColor, '#222222', 2);

          // Desenhar símbolo
          this._drawPieceSymbol(center.x, center.y, piece);

          // Desenhar modificador de cor
          if (piece.modifier) {
            this._drawModifier(center.x, center.y + this.hexSize * 0.22, piece.modifier);
          }

          ctx.globalAlpha = 1;

          // Highlight de hover
          if (isHover && this.game.state === 'playing' && this.game.selectedHandPiece === null) {
            const canRemove = this.game.canRemove(q, r);
            const highlightColor = canRemove ? this.colors.canRemove : this.colors.cantRemove;
            this._drawHex(center.x, center.y, this.hexSize * 0.95, 'transparent', highlightColor, 4);
          }
        } else {
          // Casa vazia
          let emptyFill = this.colors.hexEmpty;

          // Highlight para recolocação
          if (this.game.selectedHandPiece !== null && this.game.state === 'playing') {
            if (isHover && this.game.canPlaceAt(q, r)) {
              emptyFill = this.colors.placeHighlight;
            }
          }

          this._drawHex(center.x, center.y, this.hexSize * 0.95, emptyFill, this.colors.hexBorder, 1.5);

          // Indicar casas válidas para recolocação com ponto sutil
          if (this.game.selectedHandPiece !== null && this.game.canPlaceAt(q, r)) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 136, 0.5)';
            ctx.fill();
          }
        }
      }
    }

    // Desenhar animações de fade
    this._drawAnimations();
  }

  // ==========================================
  // Sistema de animações
  // ==========================================

  /**
   * Adiciona uma animação de fade-out (remoção de peça)
   */
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
      duration: 200,
      alpha: 1
    });
  }

  /**
   * Adiciona uma animação de fade-in (colocação de peça)
   */
  addFadeIn(q, r) {
    const key = `${q},${r}`;
    this.animations.push({
      type: 'fadeIn',
      key,
      startTime: performance.now(),
      duration: 200
    });
  }

  /**
   * Atualiza animações ativas
   */
  _updateAnimations() {
    const now = performance.now();
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      return elapsed < anim.duration;
    });
  }

  /**
   * Desenha efeitos de animação
   */
  _drawAnimations() {
    const ctx = this.ctx;
    const now = performance.now();

    for (const anim of this.animations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (anim.type === 'fadeOut') {
        const alpha = 1 - progress;
        ctx.globalAlpha = alpha;
        const fillColor = this.colors[anim.piece.color] || '#888';
        const scale = 1 + progress * 0.2; // Levemente expande ao desaparecer
        this._drawHex(anim.cx, anim.cy, this.hexSize * 0.95 * scale, fillColor, '#222', 2);
        this._drawPieceSymbol(anim.cx, anim.cy, anim.piece);
        if (anim.piece.modifier) {
          this._drawModifier(anim.cx, anim.cy + this.hexSize * 0.22, anim.piece.modifier);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * Retorna alpha para fade-in (se casa está em animação de fade-in)
   */
  _getAnimationAlpha(key) {
    const now = performance.now();
    for (const anim of this.animations) {
      if (anim.type === 'fadeIn' && anim.key === key) {
        const elapsed = now - anim.startTime;
        return Math.min(elapsed / anim.duration, 1);
      }
    }
    return 1;
  }

  // ==========================================
  // Atualização de hover
  // ==========================================

  /**
   * Atualiza a posição do mouse e calcula hover
   */
  updateHover(x, y) {
    this.mouseX = x;
    this.mouseY = y;
    this.hoverHex = this.pixelToHex(x, y);
  }

  /**
   * Limpa o hover
   */
  clearHover() {
    this.hoverHex = null;
  }
}
