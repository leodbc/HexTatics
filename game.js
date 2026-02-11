// game.js — Lógica principal do jogo de puzzle hexagonal
// Contém a classe Game com toda a mecânica do jogo

class Game {
  constructor() {
    // Estado do tabuleiro: Map com chave "q,r" → objeto peça {color, modifier?} ou null
    this.board = new Map();
    // Máscara do tabuleiro: quais casas existem
    this.mask = new Map();
    // Mão do jogador: array de peças removidas que podem ser recolocadas
    this.hand = [];
    // Contador de movimentos
    this.moves = 0;
    // Limite de movimentos (null = sem limite)
    this.moveLimit = null;
    // Histórico de ações para undo
    this.history = [];
    // Dados da fase atual
    this.currentLevel = null;
    // Estado do jogo
    this.state = 'playing'; // 'playing', 'won', 'lost'
    // Peça selecionada na mão para recolocação (índice no array hand)
    this.selectedHandPiece = null;
    // Dimensões do grid
    this.cols = 0;
    this.rows = 0;
    // Callback para atualizar UI
    this.onStateChange = null;
  }

  // ==========================================
  // Inicialização e carregamento de fase
  // ==========================================

  /**
   * Carrega uma fase a partir do objeto de definição
   */
  loadLevel(level) {
    this.currentLevel = level;
    this.cols = level.gridSize.cols;
    this.rows = level.gridSize.rows;
    this.moveLimit = level.moveLimit;
    this.moves = 0;
    this.hand = [];
    this.history = [];
    this.state = 'playing';
    this.selectedHandPiece = null;

    // Inicializar máscara e tabuleiro
    this.board.clear();
    this.mask.clear();

    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const key = `${q},${r}`;
        const exists = level.mask[r] && level.mask[r][q];
        this.mask.set(key, !!exists);
        this.board.set(key, null);
      }
    }

    // Colocar peças no tabuleiro
    for (const p of level.pieces) {
      const key = `${p.q},${p.r}`;
      this.board.set(key, {
        color: p.color,
        modifier: p.modifier || null
      });
    }

    this._notify();
  }

  /**
   * Reinicia a fase atual
   */
  reset() {
    if (this.currentLevel) {
      this.loadLevel(this.currentLevel);
    }
  }

  // ==========================================
  // Sistema de coordenadas hexagonais (flat-top, odd-q offset)
  // ==========================================

  /**
   * Retorna as 6 direções de vizinhos para um hexágono flat-top com offset odd-q.
   * Direções: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW
   * Os offsets dependem da paridade da coluna.
   */
  getNeighborOffsets(q) {
    // Para hexágonos flat-top com odd-q offset:
    // Colunas pares e ímpares têm offsets diferentes
    if (q % 2 === 0) {
      // Coluna par
      return [
        { dq: +1, dr: -1, dir: 0 }, // NE
        { dq: +1, dr:  0, dir: 1 }, // SE (E em flat-top)
        { dq:  0, dr: +1, dir: 2 }, // S
        { dq: -1, dr:  0, dir: 3 }, // SW (W em flat-top)
        { dq: -1, dr: -1, dir: 4 }, // NW
        { dq:  0, dr: -1, dir: 5 }  // N
      ];
    } else {
      // Coluna ímpar
      return [
        { dq: +1, dr:  0, dir: 0 }, // NE
        { dq: +1, dr: +1, dir: 1 }, // SE
        { dq:  0, dr: +1, dir: 2 }, // S
        { dq: -1, dr: +1, dir: 3 }, // SW
        { dq: -1, dr:  0, dir: 4 }, // NW
        { dq:  0, dr: -1, dir: 5 }  // N
      ];
    }
  }

  /**
   * Retorna os vizinhos de uma casa (q, r) que existem no tabuleiro (máscara)
   * Cada vizinho tem {q, r, dir} onde dir é o índice da direção (0-5)
   */
  getNeighbors(q, r) {
    const offsets = this.getNeighborOffsets(q);
    const neighbors = [];
    for (const off of offsets) {
      const nq = q + off.dq;
      const nr = r + off.dr;
      const key = `${nq},${nr}`;
      if (this.mask.get(key)) {
        neighbors.push({ q: nq, r: nr, dir: off.dir });
      }
    }
    return neighbors;
  }

  /**
   * Retorna pares de direções opostas.
   * Em um hexágono de 6 direções: 0↔3, 1↔4, 2↔5
   * (NE↔SW, SE↔NW, S↔N)
   */
  getOppositeDirection(dir) {
    return (dir + 3) % 6;
  }

  // ==========================================
  // Lógica de verificação de remoção de peças
  // ==========================================

  /**
   * Verifica se uma casa está no tabuleiro
   */
  cellExists(q, r) {
    return this.mask.get(`${q},${r}`) || false;
  }

  /**
   * Retorna a peça em uma posição, ou null
   */
  getPiece(q, r) {
    return this.board.get(`${q},${r}`) || null;
  }

  /**
   * Conta peças adjacentes (ignorando cinzas e aplicando filtro de modificador)
   * Retorna: {
   *   filledCount: número de casas adjacentes com peças (filtradas),
   *   totalSlots: número total de casas adjacentes existentes (filtradas),
   *   filledDirs: array de direções das casas preenchidas
   * }
   */
  countAdjacent(q, r, modifier = null) {
    const neighbors = this.getNeighbors(q, r);
    let filledCount = 0;
    let totalSlots = 0;
    const filledDirs = [];

    for (const n of neighbors) {
      const piece = this.getPiece(n.q, n.r);

      // Cinzas são completamente ignoradas — não contam como slot nem como peça
      if (piece && piece.color === 'gray') {
        continue; // Ignorar cinza tanto como peça quanto como slot
      }

      // Se não é cinza, este slot "existe" para a contagem
      // Mas se a casa tem uma peça cinza, já pulamos acima.
      // Se a casa está vazia ou tem peça não-cinza, conta como slot existente.
      totalSlots++;

      if (piece) {
        // Se há modificador, só conta peças da cor do modificador
        if (modifier) {
          if (piece.color === modifier) {
            filledCount++;
            filledDirs.push(n.dir);
          }
          // Peça de outra cor (não modificador): não conta como preenchida
        } else {
          // Sem modificador: qualquer peça não-cinza conta
          filledCount++;
          filledDirs.push(n.dir);
        }
      }
    }

    return { filledCount, totalSlots, filledDirs };
  }

  /**
   * Verifica se uma peça em (q, r) pode ser removida
   * Retorna true/false
   */
  canRemove(q, r) {
    if (this.state !== 'playing') return false;

    const piece = this.getPiece(q, r);
    if (!piece) return false;

    // Verificar limite de movimentos
    if (this.moveLimit !== null && this.moves >= this.moveLimit) return false;

    switch (piece.color) {
      case 'red':
        return this._canRemoveRed(q, r, piece.modifier);
      case 'blue':
        return this._canRemoveBlue(q, r, piece.modifier);
      case 'green':
        return this._canRemoveGreen(q, r, piece.modifier);
      case 'yellow':
        return this._canRemoveYellow(q, r, piece.modifier);
      case 'gray':
        return this._canRemoveGray();
      default:
        return false;
    }
  }

  /**
   * Peça VERMELHA: 1 <= adjacentes < total_slots
   * Deve ter ao menos 1 adjacente E não ter todas preenchidas
   */
  _canRemoveRed(q, r, modifier) {
    const { filledCount, totalSlots } = this.countAdjacent(q, r, modifier);
    return filledCount >= 1 && filledCount < totalSlots;
  }

  /**
   * Peça AZUL: nenhuma adjacente (0 peças adjacentes)
   */
  _canRemoveBlue(q, r, modifier) {
    const { filledCount } = this.countAdjacent(q, r, modifier);
    return filledCount === 0;
  }

  /**
   * Peça VERDE: todas as casas adjacentes preenchidas
   */
  _canRemoveGreen(q, r, modifier) {
    const { filledCount, totalSlots } = this.countAdjacent(q, r, modifier);
    // Se não há slots (todas são cinzas), considerar que está satisfeita
    if (totalSlots === 0) return true;
    return filledCount === totalSlots;
  }

  /**
   * Peça AMARELA: exatamente 3 adjacentes E nenhum par oposto preenchido
   */
  _canRemoveYellow(q, r, modifier) {
    const { filledCount, filledDirs } = this.countAdjacent(q, r, modifier);

    if (filledCount !== 3) return false;

    // Verificar se existe algum par de direções opostas preenchidas
    for (const dir of filledDirs) {
      const opposite = this.getOppositeDirection(dir);
      if (filledDirs.includes(opposite)) {
        return false; // Par oposto encontrado — não pode remover
      }
    }
    return true;
  }

  /**
   * Peça CINZA: só pode ser removida quando não há nenhuma outra peça não-cinza no tabuleiro
   * (apenas verifica o tabuleiro, não a mão do jogador)
   */
  _canRemoveGray() {
    for (const [key, piece] of this.board) {
      if (piece && piece.color !== 'gray') {
        return false;
      }
    }
    return true;
  }

  // ==========================================
  // Ações do jogador
  // ==========================================

  /**
   * Remove uma peça do tabuleiro
   * Retorna true se a ação foi executada
   */
  removePiece(q, r) {
    if (!this.canRemove(q, r)) return false;

    const piece = this.getPiece(q, r);
    const key = `${q},${r}`;

    // Registrar no histórico
    this.history.push({
      type: 'remove',
      q, r,
      piece: { ...piece }
    });

    // Remover do tabuleiro
    this.board.set(key, null);
    this.moves++;

    // Se não for cinza, adicionar à mão
    if (piece.color !== 'gray') {
      this.hand.push({ ...piece });
    }

    // Verificar estado do jogo
    this._checkGameState();
    this._notify();
    return true;
  }

  /**
   * Coloca uma peça da mão no tabuleiro
   * handIndex: índice da peça na mão
   * q, r: posição no tabuleiro
   * Retorna true se a ação foi executada
   */
  placePiece(q, r, handIndex) {
    if (this.state !== 'playing') return false;
    if (handIndex < 0 || handIndex >= this.hand.length) return false;

    const key = `${q},${r}`;
    if (!this.mask.get(key)) return false;
    if (this.board.get(key) !== null) return false;

    // Verificar limite de movimentos
    if (this.moveLimit !== null && this.moves >= this.moveLimit) return false;

    const piece = this.hand[handIndex];

    // Registrar no histórico
    this.history.push({
      type: 'place',
      q, r,
      piece: { ...piece },
      handIndex
    });

    // Colocar no tabuleiro
    this.board.set(key, { ...piece });
    this.hand.splice(handIndex, 1);
    this.moves++;

    // Verificar estado
    this._checkGameState();
    this._notify();
    return true;
  }

  /**
   * Desfaz a última ação
   */
  undo() {
    if (this.history.length === 0) return false;

    const action = this.history.pop();

    if (action.type === 'remove') {
      // Re-colocar a peça no tabuleiro
      const key = `${action.q},${action.r}`;
      this.board.set(key, { ...action.piece });

      // Se não era cinza, remover da mão (último adicionado)
      if (action.piece.color !== 'gray') {
        // Encontrar e remover da mão
        for (let i = this.hand.length - 1; i >= 0; i--) {
          if (this.hand[i].color === action.piece.color &&
              this.hand[i].modifier === action.piece.modifier) {
            this.hand.splice(i, 1);
            break;
          }
        }
      }
      this.moves--;
    } else if (action.type === 'place') {
      // Remover do tabuleiro
      const key = `${action.q},${action.r}`;
      this.board.set(key, null);

      // Devolver à mão na posição original
      this.hand.splice(action.handIndex, 0, { ...action.piece });
      this.moves--;
    }

    // Resetar estado para playing se necessário
    this.state = 'playing';
    this.selectedHandPiece = null;

    this._notify();
    return true;
  }

  /**
   * Verifica se o jogo foi vencido ou se excedeu o limite
   */
  _checkGameState() {
    // Verificar vitória: tabuleiro completamente vazio (mão não importa)
    let hasAnyPiece = false;
    for (const [key, piece] of this.board) {
      if (piece !== null) {
        hasAnyPiece = true;
        break;
      }
    }

    if (!hasAnyPiece) {
      this.state = 'won';
      return;
    }

    // Verificar limite de movimentos excedido
    if (this.moveLimit !== null && this.moves >= this.moveLimit) {
      if (hasAnyPiece) {
        this.state = 'lost';
      }
    }
  }

  /**
   * Verifica vitória explicitamente (tabuleiro vazio = vitória)
   */
  checkWin() {
    for (const [key, piece] of this.board) {
      if (piece !== null) return false;
    }
    return true;
  }

  /**
   * Seleciona uma peça da mão para recolocação
   */
  selectHandPiece(index) {
    if (index >= 0 && index < this.hand.length) {
      this.selectedHandPiece = index;
    } else {
      this.selectedHandPiece = null;
    }
    this._notify();
  }

  /**
   * Desseleciona peça da mão
   */
  deselectHandPiece() {
    this.selectedHandPiece = null;
    this._notify();
  }

  /**
   * Verifica se uma casa é válida para colocar uma peça
   */
  canPlaceAt(q, r) {
    if (this.state !== 'playing') return false;
    if (this.selectedHandPiece === null) return false;
    if (this.moveLimit !== null && this.moves >= this.moveLimit) return false;
    const key = `${q},${r}`;
    return this.mask.get(key) && this.board.get(key) === null;
  }

  /**
   * Notifica observers de mudança de estado
   */
  _notify() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  // ==========================================
  // Utilitários para serialização (para o solver)
  // ==========================================

  /**
   * Retorna um snapshot do estado atual para o solver
   */
  getState() {
    const boardState = {};
    for (const [key, piece] of this.board) {
      if (piece) {
        boardState[key] = { ...piece };
      }
    }
    return {
      board: boardState,
      hand: this.hand.map(p => ({ ...p })),
      moves: this.moves
    };
  }

  /**
   * Restaura um estado serializado
   */
  setState(state) {
    // Limpar tabuleiro
    for (const [key] of this.board) {
      this.board.set(key, null);
    }
    // Restaurar peças
    for (const key in state.board) {
      this.board.set(key, { ...state.board[key] });
    }
    this.hand = state.hand.map(p => ({ ...p }));
    this.moves = state.moves;
  }

  /**
   * Retorna todas as ações possíveis no estado atual
   */
  getPossibleActions() {
    const actions = [];

    if (this.state !== 'playing') return actions;
    if (this.moveLimit !== null && this.moves >= this.moveLimit) return actions;

    // Ações de remoção
    for (const [key, piece] of this.board) {
      if (piece) {
        const [q, r] = key.split(',').map(Number);
        if (this.canRemove(q, r)) {
          actions.push({ type: 'remove', q, r });
        }
      }
    }

    // Ações de recolocação (para cada peça na mão)
    for (let hi = 0; hi < this.hand.length; hi++) {
      for (const [key, piece] of this.board) {
        if (piece === null && this.mask.get(key)) {
          const [q, r] = key.split(',').map(Number);
          actions.push({ type: 'place', q, r, handIndex: hi });
        }
      }
    }

    return actions;
  }
}
