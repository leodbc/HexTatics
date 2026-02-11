// solver.js — Solver BFS/DFS para verificar se uma fase é solucionável
// Pode ser ativado no console do navegador com solve(levelId)
// Encontra a solução com menor número de movimentos

/**
 * Solver para o puzzle hexagonal
 * Usa BFS para encontrar a solução ótima (menor movimentos)
 * Para puzzles complexos, usa DFS com podas
 */
class Solver {
  constructor() {
    this.maxStates = 100000; // Limite de estados para evitar travamento
    this.statesExplored = 0;
    this.solution = null;
  }

  /**
   * Serializa o estado do jogo em uma string para uso como chave em Set/Map
   */
  serializeState(game) {
    const boardParts = [];
    for (const [key, piece] of game.board) {
      if (piece) {
        boardParts.push(`${key}:${piece.color}${piece.modifier ? '.' + piece.modifier : ''}`);
      }
    }
    boardParts.sort();

    const handParts = game.hand
      .map(p => `${p.color}${p.modifier ? '.' + p.modifier : ''}`)
      .sort();

    return boardParts.join('|') + '##' + handParts.join('|');
  }

  /**
   * Resolve uma fase usando BFS
   * Retorna array de ações para resolver, ou null se impossível
   */
  solveBFS(levelId) {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) {
      console.error(`Fase ${levelId} não encontrada!`);
      return null;
    }

    console.log(`🔍 Resolvendo fase ${levelId}: "${level.name}"...`);
    const startTime = performance.now();

    // Criar instância do jogo para simulação
    const game = new Game();
    game.loadLevel(level);

    // BFS
    const visited = new Set();
    const queue = [];

    const initialState = this.serializeState(game);
    visited.add(initialState);
    queue.push({
      state: game.getState(),
      actions: [],
      moves: 0
    });

    this.statesExplored = 0;

    while (queue.length > 0 && this.statesExplored < this.maxStates) {
      const current = queue.shift();
      this.statesExplored++;

      // Restaurar estado
      game.setState(current.state);
      game.moves = current.moves;
      game.state = 'playing';

      // Verificar vitória
      if (game.checkWin()) {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Solução encontrada! ${current.actions.length} movimentos, ${this.statesExplored} estados explorados, ${elapsed}s`);
        console.log('Ações:', current.actions);
        this.solution = current.actions;
        return current.actions;
      }

      // Verificar limite de movimentos
      if (level.moveLimit && current.moves >= level.moveLimit) {
        continue;
      }

      // Gerar ações possíveis
      const possibleActions = game.getPossibleActions();

      // Priorizar remoções sobre colocações para reduzir branching
      possibleActions.sort((a, b) => {
        if (a.type === 'remove' && b.type === 'place') return -1;
        if (a.type === 'place' && b.type === 'remove') return 1;
        return 0;
      });

      // Limitar ações de recolocação para reduzir espaço de busca
      let placeCount = 0;
      const maxPlaceActions = 5; // Limitar recolocações para performance

      for (const action of possibleActions) {
        if (action.type === 'place') {
          placeCount++;
          if (placeCount > maxPlaceActions) continue;
        }

        // Salvar estado atual
        const savedState = game.getState();
        const savedMoves = game.moves;

        // Executar ação
        if (action.type === 'remove') {
          game.removePiece(action.q, action.r);
        } else {
          game.selectedHandPiece = action.handIndex;
          game.placePiece(action.q, action.r, action.handIndex);
        }

        const newStateKey = this.serializeState(game);

        if (!visited.has(newStateKey)) {
          visited.add(newStateKey);
          queue.push({
            state: game.getState(),
            actions: [...current.actions, action],
            moves: game.moves
          });
        }

        // Restaurar estado
        game.setState(savedState);
        game.moves = savedMoves;
        game.state = 'playing';
      }
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ Nenhuma solução encontrada após ${this.statesExplored} estados (${elapsed}s)`);
    return null;
  }

  /**
   * Resolve usando DFS com profundidade limitada (mais eficiente para puzzles complexos)
   */
  solveDFS(levelId, maxDepth = 20) {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) {
      console.error(`Fase ${levelId} não encontrada!`);
      return null;
    }

    console.log(`🔍 Resolvendo fase ${levelId} (DFS, max depth ${maxDepth}): "${level.name}"...`);
    const startTime = performance.now();

    const game = new Game();
    game.loadLevel(level);

    this.statesExplored = 0;
    const visited = new Set();
    const result = this._dfsHelper(game, [], visited, maxDepth, level.moveLimit);

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    if (result) {
      console.log(`✅ Solução encontrada! ${result.length} movimentos, ${this.statesExplored} estados, ${elapsed}s`);
      console.log('Ações:', result);
      this.solution = result;
    } else {
      console.log(`❌ Sem solução (DFS, ${this.statesExplored} estados, ${elapsed}s)`);
    }
    return result;
  }

  _dfsHelper(game, actions, visited, maxDepth, moveLimit) {
    this.statesExplored++;
    if (this.statesExplored > this.maxStates) return null;

    if (game.checkWin()) return actions;
    if (actions.length >= maxDepth) return null;
    if (moveLimit && game.moves >= moveLimit) return null;

    const stateKey = this.serializeState(game);
    if (visited.has(stateKey)) return null;
    visited.add(stateKey);

    const possibleActions = game.getPossibleActions();

    // Priorizar remoções
    possibleActions.sort((a, b) => {
      if (a.type === 'remove' && b.type === 'place') return -1;
      if (a.type === 'place' && b.type === 'remove') return 1;
      return 0;
    });

    let placeCount = 0;
    for (const action of possibleActions) {
      if (action.type === 'place') {
        placeCount++;
        if (placeCount > 5) continue;
      }

      const savedState = game.getState();
      const savedMoves = game.moves;

      if (action.type === 'remove') {
        game.removePiece(action.q, action.r);
      } else {
        game.placePiece(action.q, action.r, action.handIndex);
      }

      const result = this._dfsHelper(game, [...actions, action], visited, maxDepth, moveLimit);
      if (result) return result;

      game.setState(savedState);
      game.moves = savedMoves;
      game.state = 'playing';
    }

    visited.delete(stateKey); // Backtrack
    return null;
  }
}

// Instância global do solver
const solver = new Solver();

/**
 * Função de conveniência para resolver uma fase no console
 * Uso: solve(1) para resolver a fase 1
 */
function solve(levelId, method = 'bfs') {
  if (method === 'dfs') {
    return solver.solveDFS(levelId);
  }
  return solver.solveBFS(levelId);
}
