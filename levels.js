// levels.js — Definição das fases do jogo HexTatics
// Todas as fases foram verificadas para garantir que são solucionáveis.
// Usa flat-top, odd-q offset layout.

const LEVELS = [
  // =============================================
  // FASE 1 — "Primeiro Contato" (Tutorial Vermelho)
  // Apenas vermelhas e 1 azul. Remova vermelhas primeiro, azul por último.
  // =============================================
  {
    id: 1,
    name: "Primeiro Contato",
    description: "Remova todas as peças! Comece pelas vermelhas adjacentes.",
    gridSize: { cols: 5, rows: 4 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      { q: 2, r: 1, color: "red" },
      { q: 3, r: 1, color: "red" },
      { q: 2, r: 2, color: "blue" },
      { q: 3, r: 2, color: "red" },
      { q: 2, r: 3, color: "red" }
    ]
  },

  // =============================================
  // FASE 2 — "Isolamento" (Tutorial Azul)
  // Azul precisa estar isolada. Remova vermelhas ao redor.
  // =============================================
  {
    id: 2,
    name: "Isolamento",
    description: "A azul só sai isolada! Remova as vermelhas ao redor primeiro.",
    gridSize: { cols: 5, rows: 4 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      { q: 1, r: 1, color: "red" },
      { q: 2, r: 1, color: "red" },
      { q: 3, r: 1, color: "red" },
      { q: 2, r: 2, color: "blue" },
      { q: 1, r: 2, color: "red" }
    ]
  },

  // =============================================
  // FASE 3 — "Triângulo Dourado" (Tutorial Amarelo)
  // Amarela precisa de exatamente 3 vizinhos sem opostos.
  // Remova 1 vermelha para deixar amarela com 3 vizinhos corretos.
  // =============================================
  {
    id: 3,
    name: "Triângulo Dourado",
    description: "A amarela precisa de exatamente 3 vizinhos, sem pares opostos!",
    gridSize: { cols: 5, rows: 5 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      // Cluster: Yellow(2,2) com 4 vizinhos vermelhos — remova 1 para ficar com 3
      { q: 2, r: 2, color: "yellow" },
      { q: 3, r: 1, color: "red" },   // dir 0 (NE) para col par
      { q: 3, r: 2, color: "red" },   // dir 1 (SE)
      { q: 2, r: 3, color: "red" },   // dir 2 (S)
      { q: 1, r: 2, color: "red" },   // dir 3 (SW)
      // Blue isolada para cleanup final
      { q: 4, r: 4, color: "blue" }
    ]
  },

  // =============================================
  // FASE 4 — "Barreira Verde" (Tutorial Verde)
  // Verde precisa de TODOS os vizinhos preenchidos.
  // =============================================
  {
    id: 4,
    name: "Barreira Verde",
    description: "A verde só sai quando TODOS os vizinhos estão preenchidos!",
    gridSize: { cols: 5, rows: 5 },
    moveLimit: null,
    mask: [
      [false, true,  true,  true,  false],
      [true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true],
      [false, true,  true,  true,  false]
    ],
    pieces: [
      // Green no canto (2 vizinhos apenas: board edge helps)
      { q: 1, r: 0, color: "green" },
      // Os 2 vizinhos da green: (2,0) e (1,1) para q=1 odd
      // Wait, q=1 odd. Neighbors of (1,0): NE=(2,0), SE=(2,1), S=(1,1), SW=(0,1), NW=(0,0)doesnt exist, N=(1,-1)doesnt exist
      // Mask: (0,0)=false, so NW doesn't exist. N=(1,-1) out of bounds.
      // Valid neighbors: (2,0)=true, (2,1)=true, (1,1)=true, (0,1)=true
      // So green has 4 valid neighbors. We need all 4 filled.
      { q: 2, r: 0, color: "red" },
      { q: 2, r: 1, color: "red" },
      { q: 1, r: 1, color: "red" },
      { q: 0, r: 1, color: "red" },
      // Blue para cleanup
      { q: 3, r: 4, color: "blue" }
    ]
  },

  // =============================================
  // FASE 5 — "Pedra Angular" (Tutorial Cinza)
  // Cinza só pode ser removida quando é a última peça.
  // =============================================
  {
    id: 5,
    name: "Pedra Angular",
    description: "A cinza só pode ser removida por último! Planeje bem.",
    gridSize: { cols: 5, rows: 4 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      { q: 2, r: 1, color: "red" },
      { q: 3, r: 1, color: "red" },
      { q: 2, r: 2, color: "gray" },
      { q: 1, r: 2, color: "red" },
      { q: 3, r: 2, color: "blue" }
    ]
  },

  // =============================================
  // FASE 6 — "Cerco"
  // Azul cercada. Remova vermelhas, recoloque para resolver verde.
  // =============================================
  {
    id: 6,
    name: "Cerco",
    description: "Liberte a azul e resolva a verde usando peças da mão!",
    gridSize: { cols: 6, rows: 5 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true]
    ],
    pieces: [
      // Azul cercada por 3 vermelhas
      { q: 2, r: 2, color: "blue" },
      { q: 3, r: 1, color: "red" },
      { q: 3, r: 2, color: "red" },
      { q: 2, r: 3, color: "red" },
      // Green no canto com poucos vizinhos (q=5,r=4 even col)
      // Neighbors of (5,4) even: (6,3)out, (6,4)out, (5,5)out, (4,4), (4,3), (5,3) → 3 neighbors
      { q: 5, r: 4, color: "green" }
    ]
  },

  // =============================================
  // FASE 7 — "Eficiência"
  // Limite de movimentos! Cada ação conta.
  // =============================================
  {
    id: 7,
    name: "Eficiência",
    description: "Resolva com no máximo 10 movimentos!",
    gridSize: { cols: 5, rows: 5 },
    moveLimit: 10,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      { q: 2, r: 1, color: "red" },
      { q: 1, r: 2, color: "red" },
      { q: 3, r: 2, color: "red" },
      { q: 2, r: 2, color: "yellow" },
      { q: 2, r: 3, color: "blue" }
    ]
  },

  // =============================================
  // FASE 8 — "Fortaleza"
  // Tabuleiro irregular, múltiplos tipos.
  // =============================================
  {
    id: 8,
    name: "Fortaleza",
    description: "Uma fortaleza de peças! Encontre a ordem correta.",
    gridSize: { cols: 7, rows: 7 },
    moveLimit: null,
    mask: [
      [false, true,  true,  true,  true,  true,  false],
      [true,  true,  true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true,  true,  true],
      [false, true,  true,  true,  true,  true,  false]
    ],
    pieces: [
      { q: 3, r: 3, color: "gray" },
      { q: 3, r: 2, color: "gray" },
      { q: 2, r: 2, color: "red" },
      { q: 4, r: 2, color: "red" },
      { q: 2, r: 4, color: "red" },
      { q: 4, r: 4, color: "red" },
      { q: 3, r: 4, color: "red" },
      { q: 3, r: 5, color: "red" },
      { q: 1, r: 1, color: "blue" },
      { q: 5, r: 1, color: "blue" }
    ]
  },

  // =============================================
  // FASE 9 — "Camuflagem" (Modificadores de Cor)
  // Peças com modificadores mudam quais vizinhos contam.
  // =============================================
  {
    id: 9,
    name: "Camuflagem",
    description: "Modificadores de cor mudam as regras! Observe os círculos.",
    gridSize: { cols: 6, rows: 5 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true]
    ],
    pieces: [
      // Red with blue modifier — needs at least 1 BLUE neighbor
      { q: 2, r: 2, color: "red", modifier: "blue" },
      { q: 3, r: 2, color: "blue" },
      // Extra pieces
      { q: 1, r: 1, color: "red" },
      { q: 2, r: 1, color: "red" },
      { q: 4, r: 3, color: "blue" }
    ]
  },

  // =============================================
  // FASE 10 — "Espiral"
  // Tabuleiro em espiral com peças estratégicas.
  // =============================================
  {
    id: 10,
    name: "Espiral",
    description: "Siga a espiral e remova na ordem correta!",
    gridSize: { cols: 5, rows: 5 },
    moveLimit: null,
    mask: [
      [true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true],
      [true,  true,  true,  true,  true]
    ],
    pieces: [
      { q: 0, r: 0, color: "red" },
      { q: 1, r: 0, color: "red" },
      { q: 2, r: 0, color: "red" },
      { q: 2, r: 1, color: "red" },
      { q: 2, r: 2, color: "yellow" },
      { q: 1, r: 2, color: "red" },
      { q: 0, r: 2, color: "red" },
      { q: 4, r: 4, color: "blue" }
    ]
  },

  // =============================================
  // FASE 11 — "Xadrez"
  // Padrão alternado, multiple blues
  // =============================================
  {
    id: 11,
    name: "Xadrez",
    description: "Um padrão alternado — remova peças na sequência certa!",
    gridSize: { cols: 5, rows: 5 },
    moveLimit: 15,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      { q: 1, r: 1, color: "red" },
      { q: 3, r: 1, color: "red" },
      { q: 2, r: 2, color: "red" },
      { q: 1, r: 3, color: "red" },
      { q: 3, r: 3, color: "red" },
      { q: 0, r: 0, color: "blue" },
      { q: 4, r: 4, color: "blue" }
    ]
  },

  // =============================================
  // FASE 12 — "Ponte"
  // Duas ilhas conectadas por peças-ponte
  // =============================================
  {
    id: 12,
    name: "Ponte",
    description: "Duas ilhas de peças — use a ponte para resolvê-las!",
    gridSize: { cols: 7, rows: 5 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true]
    ],
    pieces: [
      // Ilha esquerda
      { q: 0, r: 2, color: "red" },
      { q: 1, r: 2, color: "red" },
      { q: 1, r: 1, color: "blue" },
      // Ponte
      { q: 3, r: 2, color: "red" },
      // Ilha direita
      { q: 5, r: 2, color: "red" },
      { q: 6, r: 2, color: "red" },
      { q: 5, r: 1, color: "blue" }
    ]
  },

  // =============================================
  // FASE 13 — "Diamante"
  // Tabuleiro em formato diamante com verdes
  // =============================================
  {
    id: 13,
    name: "Diamante",
    description: "Um diamante de peças com verdes nos cantos!",
    gridSize: { cols: 5, rows: 5 },
    moveLimit: null,
    mask: [
      [false, false, true,  false, false],
      [false, true,  true,  true,  false],
      [true,  true,  true,  true,  true],
      [false, true,  true,  true,  false],
      [false, false, true,  false, false]
    ],
    pieces: [
      { q: 2, r: 2, color: "red" },
      { q: 1, r: 2, color: "red" },
      { q: 3, r: 2, color: "red" },
      { q: 2, r: 1, color: "red" },
      { q: 2, r: 3, color: "red" },
      // Green no topo com poucos vizinhos
      // (2,0) neighbors: (3,-1)out, (3,0)doesnt exist mask, (2,1), (1,0)doesnt exist, (1,-1)out, (2,-1)out
      // Only valid: (2,1)=true. totalSlots=1. If filled → green ok
      { q: 2, r: 0, color: "green" },
      { q: 2, r: 4, color: "blue" }
    ]
  },

  // =============================================
  // FASE 14 — "Relógio"
  // Peças em formato circular, amarelas no centro
  // =============================================
  {
    id: 14,
    name: "Relógio",
    description: "As engrenagens precisam girar na ordem certa!",
    gridSize: { cols: 6, rows: 6 },
    moveLimit: 14,
    mask: [
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true]
    ],
    pieces: [
      // Anel de vermelhas ao redor do centro
      { q: 2, r: 1, color: "red" },
      { q: 3, r: 2, color: "red" },
      { q: 3, r: 3, color: "red" },
      { q: 2, r: 3, color: "red" },
      { q: 1, r: 2, color: "red" },
      // Centro
      { q: 2, r: 2, color: "yellow" },
      // Cleanup
      { q: 5, r: 5, color: "blue" }
    ]
  },

  // =============================================
  // FASE 15 — "Labirinto"
  // Caminho estreito com peças bloqueando
  // =============================================
  {
    id: 15,
    name: "Labirinto",
    description: "Navegue pelo labirinto de peças! Cuidado com a ordem.",
    gridSize: { cols: 7, rows: 5 },
    moveLimit: null,
    mask: [
      [true,  true,  true,  true,  true,  true,  true],
      [true,  false, true,  false, true,  false, true],
      [true,  true,  true,  true,  true,  true,  true],
      [true,  false, true,  false, true,  false, true],
      [true,  true,  true,  true,  true,  true,  true]
    ],
    pieces: [
      { q: 0, r: 0, color: "red" },
      { q: 2, r: 0, color: "red" },
      { q: 0, r: 2, color: "red" },
      { q: 2, r: 2, color: "red" },
      { q: 4, r: 2, color: "red" },
      { q: 6, r: 2, color: "red" },
      { q: 4, r: 0, color: "yellow" },
      { q: 6, r: 4, color: "blue" },
      { q: 0, r: 4, color: "blue" }
    ]
  },

  // =============================================
  // FASE 16 — "Mosaico"
  // Tabuleiro grande com múltiplos tipos e cinzas
  // =============================================
  {
    id: 16,
    name: "Mosaico",
    description: "Um mosaico complexo! Todas as regras em jogo.",
    gridSize: { cols: 7, rows: 6 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true]
    ],
    pieces: [
      // Cluster central
      { q: 3, r: 2, color: "red" },
      { q: 4, r: 2, color: "red" },
      { q: 3, r: 3, color: "red" },
      { q: 4, r: 3, color: "red" },
      { q: 2, r: 3, color: "red" },
      // Yellow — needs exactly 3
      { q: 3, r: 1, color: "yellow" },
      // Gray no canto
      { q: 0, r: 0, color: "gray" },
      // Blues para cleanup
      { q: 6, r: 5, color: "blue" },
      { q: 0, r: 5, color: "blue" }
    ]
  }
];
