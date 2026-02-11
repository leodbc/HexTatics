// levels.js — Definição das fases do jogo de puzzle hexagonal
// Cada fase define o tabuleiro, máscara, peças e limite de movimentos

const LEVELS = [
  // =============================================
  // FASE 1 — "Primeiro Contato" (Tutorial)
  // Tabuleiro 5×4, poucas peças, apenas vermelhas e 1 azul
  // Sem limite de movimentos. Solução simples em ~5 movimentos.
  // =============================================
  {
    id: 1,
    name: "Primeiro Contato",
    description: "Remova todas as peças do tabuleiro. Comece pelas vermelhas!",
    gridSize: { cols: 5, rows: 4 },
    moveLimit: null,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true]
    ],
    pieces: [
      // Azul no centro, cercada parcialmente por vermelhas
      { q: 2, r: 1, color: "red" },
      { q: 3, r: 1, color: "red" },
      { q: 2, r: 2, color: "blue" },
      { q: 3, r: 2, color: "red" },
      { q: 2, r: 3, color: "red" }
    ]
  },

  // =============================================
  // FASE 2 — "Cerco" (Partida Simples)
  // 1 azul cercada por 5 vermelhas, 1 verde isolada no canto oposto
  // Sem limite.
  // =============================================
  {
    id: 2,
    name: "Cerco",
    description: "A peça azul está cercada! Libere-a removendo as vermelhas e resolva a verde.",
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
      // Azul no centro com vermelhas ao redor
      { q: 3, r: 2, color: "blue" },
      { q: 2, r: 2, color: "red" },
      { q: 4, r: 2, color: "red" },
      { q: 3, r: 1, color: "red" },
      { q: 3, r: 3, color: "red" },
      { q: 2, r: 1, color: "red" },
      // Verde isolada no canto oposto — precisa ser cercada por peças recolocadas
      { q: 6, r: 5, color: "green" }
    ]
  },

  // =============================================
  // FASE 3 — "Triângulo Dourado" (Mais Regras)
  // 2 vermelhas, 1 verde, 1 amarela, 2 cinzas
  // Sem limite. Envolve todas as regras base.
  // =============================================
  {
    id: 3,
    name: "Triângulo Dourado",
    description: "Use todas as regras para resolver este puzzle com peça amarela!",
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
      { q: 2, r: 1, color: "red" },
      { q: 4, r: 1, color: "red" },
      { q: 3, r: 2, color: "yellow" },
      { q: 3, r: 4, color: "green" },
      { q: 1, r: 3, color: "gray" },
      { q: 5, r: 3, color: "gray" }
    ]
  },

  // =============================================
  // FASE 4 — "Fortaleza" (Regras Avançadas)
  // Tabuleiro 7×7, configuração densa
  // Sem limite. Puzzle complexo.
  // =============================================
  {
    id: 4,
    name: "Fortaleza",
    description: "Uma fortaleza de peças! Encontre a ordem correta de remoção.",
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
      // Parede central de cinzas
      { q: 3, r: 3, color: "gray" },
      { q: 3, r: 2, color: "gray" },
      // Azuis nos cantos
      { q: 1, r: 1, color: "blue" },
      { q: 5, r: 1, color: "blue" },
      // Vermelhas ao redor
      { q: 2, r: 2, color: "red" },
      { q: 4, r: 2, color: "red" },
      { q: 2, r: 4, color: "red" },
      { q: 4, r: 4, color: "red" },
      // Verdes
      { q: 1, r: 5, color: "green" },
      { q: 5, r: 5, color: "green" },
      // Mais vermelhas
      { q: 3, r: 4, color: "red" },
      { q: 3, r: 5, color: "red" }
    ]
  },

  // =============================================
  // FASE 5 — "Eficiência" (Limite de Movimentos)
  // 3 vermelhas, 1 azul, 1 amarela
  // Limite: 8 movimentos
  // =============================================
  {
    id: 5,
    name: "Eficiência",
    description: "Resolva com no máximo 8 movimentos! Cada ação conta.",
    gridSize: { cols: 7, rows: 6 },
    moveLimit: 8,
    mask: [
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true]
    ],
    pieces: [
      { q: 2, r: 1, color: "red" },
      { q: 4, r: 1, color: "red" },
      { q: 3, r: 2, color: "blue" },
      { q: 3, r: 3, color: "yellow" },
      { q: 3, r: 4, color: "red" }
    ]
  },

  // =============================================
  // FASE 6 — "Camuflagem" (Modificadores de Cor)
  // Peças com modificadores de cor
  // Sem limite. Dificuldade elevada.
  // =============================================
  {
    id: 6,
    name: "Camuflagem",
    description: "Modificadores de cor mudam as regras! Preste atenção nos círculos.",
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
      // Vermelha com modificador azul — precisa de ao menos 1 AZUL adjacente
      { q: 2, r: 2, color: "red", modifier: "blue" },
      // Azul adjacente para satisfazer a vermelha modificada
      { q: 3, r: 2, color: "blue" },
      // Verde com modificador amarelo — precisa de TUDO amarelo adjacente
      { q: 5, r: 3, color: "green", modifier: "yellow" },
      // Amarelas ao redor da verde
      { q: 4, r: 3, color: "yellow" },
      { q: 5, r: 2, color: "yellow" },
      { q: 5, r: 4, color: "yellow" },
      // Vermelha normal
      { q: 1, r: 1, color: "red" },
      { q: 2, r: 1, color: "red" }
    ]
  }
];
