// solver.js — Solver BFS para validar fases do puzzle hexagonal
// Encontra a solução com menor número de movimentos.
// Ativável no console com: solve(levelId)

function solve(levelId) {
    const levelDef = LEVELS.find(l => l.id === levelId);
    if (!levelDef) {
        console.error(`Fase ${levelId} não encontrada.`);
        return null;
    }

    console.log(`🔍 Resolvendo fase ${levelId}: "${levelDef.name}"...`);
    const startTime = performance.now();

    // Cria uma instância isolada do jogo para simular
    const game = new Game();
    game.loadLevel(levelDef);

    // Pré-calcula todas as células válidas do tabuleiro (inclui vazias)
    const allCells = game.getAllCells();

    // Estado serializado para evitar revisitar
    const visited = new Set();

    // BFS: fila de estados
    const queue = [];
    let queueHead = 0;
    const initialState = _serializeState(game);
    visited.add(initialState);
    queue.push({ game: _cloneGameState(game), actions: [] });

    let iterations = 0;
    const maxIterations = 500000;

    while (queueHead < queue.length && iterations < maxIterations) {
        iterations++;
        const current = queue[queueHead++];
        const g = current.game;

        if (levelDef.moveLimit && g.moves > levelDef.moveLimit) {
            continue;
        }

        // Verifica vitória (board vazio = vitória, independente da mão)
        if (g.board.size === 0 && (!levelDef.moveLimit || g.moves <= levelDef.moveLimit)) {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Solução encontrada em ${current.actions.length} movimentos! (${iterations} estados explorados, ${elapsed}s)`);
            console.log("Ações:", current.actions);
            return current.actions;
        }

        // 1. Remover peças que podem ser removidas
        for (const cell of allCells) {
            const piece = g.board.get(`${cell.q},${cell.r}`);
            if (!piece) continue;

            const newGame = _restoreGameState(g, levelDef);
            if (newGame.canRemove(cell.q, cell.r)) {
                newGame.removePiece(cell.q, cell.r);
                if (newGame.moveLimitExceeded) continue;
                const state = _serializeState(newGame);
                if (!visited.has(state)) {
                    visited.add(state);
                    queue.push({
                        game: _cloneGameState(newGame),
                        actions: [...current.actions, { type: "remove", q: cell.q, r: cell.r }],
                    });
                }
            }
        }

        // 2. Colocar peças da mão em casas vazias
        // Otimização: evita duplicatas quando peças na mão são iguais
        const usedHandPieces = new Set();
        for (let hi = 0; hi < g.hand.length; hi++) {
            const pieceKey = `${g.hand[hi].color}|${g.hand[hi].modifier || ''}`;
            if (usedHandPieces.has(pieceKey)) continue;
            usedHandPieces.add(pieceKey);

            for (const ec of allCells) {
                if (g.board.has(`${ec.q},${ec.r}`)) continue; // casa ocupada

                const newGame = _restoreGameState(g, levelDef);
                if (newGame.placePiece(ec.q, ec.r, hi)) {
                    if (newGame.moveLimitExceeded) continue;
                    const state = _serializeState(newGame);
                    if (!visited.has(state)) {
                        visited.add(state);
                        queue.push({
                            game: _cloneGameState(newGame),
                            actions: [...current.actions, { type: "place", q: ec.q, r: ec.r, handIndex: hi }],
                        });
                    }
                }
            }
        }
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ Nenhuma solução encontrada (${iterations} estados explorados, ${elapsed}s)`);
    return null;
}

// Serializa o estado do jogo para comparação
function _serializeState(game) {
    const boardEntries = [];
    for (const [key, piece] of game.board) {
        boardEntries.push(`${key}:${piece.color}${piece.modifier ? '+' + piece.modifier : ''}`);
    }
    boardEntries.sort();
    const handStr = game.hand.map(p => `${p.color}${p.modifier ? '+' + p.modifier : ''}`).sort().join(';');
    const lastRemoved = game.lastRemovedPiece
        ? `${game.lastRemovedPiece.color}${game.lastRemovedPiece.modifier ? '+' + game.lastRemovedPiece.modifier : ''}`
        : "none";
    return boardEntries.join('|') + '##' + handStr + '##' + lastRemoved;
}

// Clona o estado relevante do jogo (sem referências compartilhadas)
function _cloneGameState(game) {
    const board = new Map();
    for (const [key, piece] of game.board) {
        board.set(key, { ...piece });
    }
    return {
        board,
        hand: game.hand.map(p => ({ ...p })),
        moves: game.moves,
        lastRemovedPiece: game.lastRemovedPiece ? { ...game.lastRemovedPiece } : null,
    };
}

// Restaura um Game a partir de um estado clonado
function _restoreGameState(state, levelDef) {
    const game = new Game();
    game.mask = levelDef.mask;
    game.gridSize = { ...levelDef.gridSize };
    game.moveLimit = levelDef.moveLimit;
    game.moves = state.moves;
    game.hand = state.hand.map(p => ({ ...p }));
    game.lastRemovedPiece = state.lastRemovedPiece ? { ...state.lastRemovedPiece } : null;
    game.board = new Map();
    for (const [key, piece] of state.board) {
        game.board.set(key, { ...piece });
    }
    game.history = [];
    game.won = false;
    game.moveLimitExceeded = false;
    game.selectedHandPiece = null;
    game.currentLevel = levelDef;
    return game;
}
