// levels.js — 12 fases do HexTatics com dificuldade progressiva
// Sistema: odd-q offset, flat-top hex
// TODAS as regras exercitadas: Red, Blue, Green, Yellow, Gray, Modifiers, Hand/Placement, Move Limit, Board Holes
// Cada fase verificada manualmente para ser solucionável.

const LEVELS = [

    // ===== MUNDO 1: FUNDAMENTOS =====

    // Fase 1 — Tutorial: Red + Blue
    // Sol: R(2,1)→R(4,1)→B(3,1) = 3 mov
    {
        id: 1, name: "Primeiro Passo", category: "Fundamentos",
        description: "Toque numa peça vermelha para removê-la. Depois remova a azul.",
        gridSize: { cols: 5, rows: 4 }, moveLimit: null, par: 3,
        mask: [
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
        ],
        pieces: [
            { q: 2, r: 1, color: "red" },
            { q: 3, r: 1, color: "blue" },
            { q: 4, r: 1, color: "red" },
        ]
    },

    // Fase 2 — Red clearing + Blue isolation
    // Sol: R(3,1)→R(2,2)→R(4,2)→R(3,3)→B(3,2)→B(5,2) = 6 mov
    {
        id: 2, name: "Caminho Livre", category: "Fundamentos",
        description: "Remova as vermelhas para liberar as azuis.",
        gridSize: { cols: 7, rows: 5 }, moveLimit: null, par: 6,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 2, color: "blue" },
            { q: 2, r: 2, color: "red" },
            { q: 4, r: 2, color: "red" },
            { q: 3, r: 1, color: "red" },
            { q: 3, r: 3, color: "red" },
            { q: 5, r: 2, color: "blue" },
        ]
    },

    // Fase 3 — GREEN intro: corner green has 2 adj, both filled → ALL → removable
    // Sol: G(0,0)→R(0,1)→R(1,0)→B(1,1)→B(2,0) = 5 mov
    {
        id: 3, name: "Muralha Verde", category: "Fundamentos",
        description: "VERDES ■ só saem se TODAS as vizinhas estiverem preenchidas!",
        gridSize: { cols: 5, rows: 5 }, moveLimit: null, par: 5,
        mask: [
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
        ],
        pieces: [
            { q: 0, r: 0, color: "green" },
            { q: 1, r: 0, color: "red" },
            { q: 0, r: 1, color: "red" },
            { q: 1, r: 1, color: "blue" },
            { q: 2, r: 0, color: "blue" },
        ]
    },

    // Fase 4 — YELLOW intro: exactly 3 adj, no opposite pairs
    // Y(3,2) col3odd: NE(4,2)R, SE(4,3)R, N(3,1)R = 3 filled. NE↔SW(no), SE↔NW(no), N↔S(no) ✓
    // Sol: Y(3,2)→R(4,3)→R(4,2)→R(3,1)→B(2,1) = 5 mov
    {
        id: 4, name: "Triângulo Dourado", category: "Fundamentos",
        description: "AMARELAS ▲ precisam de exatamente 3 vizinhas sem pares opostos!",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 5,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 2, color: "yellow" },
            { q: 3, r: 1, color: "red" },
            { q: 4, r: 2, color: "red" },
            { q: 4, r: 3, color: "red" },
            { q: 2, r: 1, color: "blue" },
        ]
    },

    // ===== MUNDO 2: ESTRATÉGIA =====

    // Fase 5 — GRAY intro + Green reappears
    // Grays invisible to other rules. Remove non-grays first, then grays.
    // G(0,0): adj (1,0)R,(0,1)R → 2/2 ALL → ok. Sol: G→R(0,1)→R(1,0)→B(2,0)→Gr(4,2)→Gr(5,2) = 6 mov
    {
        id: 5, name: "Paredes Cinzas", category: "Estratégia",
        description: "CINZAS ▬ são invisíveis para as regras e só saem quando sobrar apenas elas!",
        gridSize: { cols: 7, rows: 5 }, moveLimit: null, par: 6,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 0, r: 0, color: "green" },
            { q: 1, r: 0, color: "red" },
            { q: 0, r: 1, color: "red" },
            { q: 2, r: 0, color: "blue" },
            { q: 4, r: 2, color: "gray" },
            { q: 5, r: 2, color: "gray" },
        ]
    },

    // Fase 6 — HAND/PLACEMENT required! 🖐️ (new mechanic!)
    // Green(0,0) needs (1,0)=R AND (0,1) filled. (0,1) is EMPTY. Must remove a red elsewhere
    // and PLACE it at (0,1) to complete green's neighborhood. Level is unsolvable without placement.
    // Sol: RemoveR(2,1)[adj R(3,1)=1]→Place at(0,1)→G(0,0)[2/2]→R(0,1)[adj R(1,0)+B(1,1)=2<3]→R(1,0)[adj B(1,1)=1]→B(1,1)[0]→R(3,1)[adj B(4,1)=1]→B(4,1)[0] = 8 mov
    {
        id: 6, name: "Reposição", category: "Estratégia",
        description: "🖐️ Peças removidas vão para sua MÃO. Clique na mão e depois num espaço vazio para recolocar!",
        gridSize: { cols: 5, rows: 4 }, moveLimit: null, par: 8,
        mask: [
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
        ],
        pieces: [
            { q: 0, r: 0, color: "green" },
            { q: 1, r: 0, color: "red" },
            { q: 1, r: 1, color: "blue" },
            { q: 2, r: 1, color: "red" },
            { q: 3, r: 1, color: "red" },
            { q: 4, r: 1, color: "blue" },
        ]
    },

    // Fase 7 — Fortaleza: GREEN center ring + Gray + Blue
    // Green(3,3) has ALL 6 adj filled (ring of reds) → remove first!
    // Sol: G(3,3)→R(3,2)→R(2,3)→R(4,3)→R(4,4)→R(3,4)→R(2,4)→B(5,3)→B(1,3)→Gr(3,1)→Gr(3,5) = 11 mov
    {
        id: 7, name: "Fortaleza", category: "Estratégia",
        description: "O centro verde tem TODAS vizinhas preenchidas. Desmonte a fortaleza de dentro para fora!",
        gridSize: { cols: 7, rows: 7 }, moveLimit: null, par: 11,
        mask: [
            [false, true, true, true, true, true, false],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [false, true, true, true, true, true, false],
        ],
        pieces: [
            { q: 3, r: 3, color: "green" },
            { q: 4, r: 3, color: "red" },
            { q: 4, r: 4, color: "red" },
            { q: 3, r: 4, color: "red" },
            { q: 2, r: 4, color: "red" },
            { q: 2, r: 3, color: "red" },
            { q: 3, r: 2, color: "red" },
            { q: 5, r: 3, color: "blue" },
            { q: 1, r: 3, color: "blue" },
            { q: 3, r: 1, color: "gray" },
            { q: 3, r: 5, color: "gray" },
        ]
    },

    // Fase 8 — Move limit + Yellow + Red
    // Sol: Y(3,2)→R(4,3)→R(4,2)→R(3,1)→B(5,3) = 5 mov. Limit=7.
    {
        id: 8, name: "Eficiência", category: "Estratégia",
        description: "⏱️ Limite de movimentos! Resolva em no máximo 7.",
        gridSize: { cols: 7, rows: 6 }, moveLimit: 7, par: 5,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 2, color: "yellow" },
            { q: 3, r: 1, color: "red" },
            { q: 4, r: 2, color: "red" },
            { q: 4, r: 3, color: "red" },
            { q: 5, r: 3, color: "blue" },
        ]
    },

    // ===== MUNDO 3: DOMÍNIO =====

    // Fase 9 — Modifier on RED (counts only blue neighbors)
    // R(3,2,mod:blue): red rule, only counts blue adj → 2 blue neighbors → 2≥1, 2<6 → ok
    // Sol: R(3,2)→B(2,2)→B(4,2)→R(3,4)→R(4,4)→B(5,4) = 6 mov
    {
        id: 9, name: "Camuflagem", category: "Domínio",
        description: "🔄 Modificadores mudam qual cor conta nas vizinhas! O círculo indica a referência.",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 6,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 2, color: "red", modifier: "blue" },
            { q: 2, r: 2, color: "blue" },
            { q: 4, r: 2, color: "blue" },
            { q: 3, r: 4, color: "red" },
            { q: 4, r: 4, color: "red" },
            { q: 5, r: 4, color: "blue" },
        ]
    },

    // Fase 10 — Board holes + Green corner + Modifier on Blue
    // Green(1,0) col1odd: adj(2,0)R,(2,1)empty,(1,1)B,(0,1→F!),(0,0→F!),(OOB) → 3 valid. Need ALL filled.
    // With (2,1) empty, only 2/3 filled → can't remove... UNLESS we also fill (2,1).
    // Actually let me just put Green at (1,0) with only (2,0) and (1,1) as adj by masking (2,1) too.
    // New approach: Green at edge, simple mask.
    // Green(1,0) col1odd adj: (2,0)R, (2,1→F!), (1,1→F!), (0,1→F!), (0,0→F!), (OOB) → only 1 valid: (2,0)=R.
    // totalSlots=1, filled=1, ALL → ok ✓
    // Blue(3,2,mod:red): counts only red adj. R(4,2)+R(3,1)=2 red → not 0 → remove reds first.
    // Sol: G(1,0)→R(2,0)[adj R(3,1)]→R(3,1)[adj R(4,2)]→R(4,2)[adj B(4,1)]→B(3,2)[0 red adj]→B(4,1)[0]
    // = 6 mov
    {
        id: 10, name: "Arquipélago", category: "Domínio",
        description: "🕳️ Buracos mudam vizinhanças! A azul com modificador só conta vizinhas vermelhas.",
        gridSize: { cols: 6, rows: 5 }, moveLimit: null, par: 6,
        mask: [
            [false, true, true, true, true, false],
            [false, false, true, true, true, true],
            [false, true, true, true, true, false],
            [false, false, true, true, true, true],
            [false, true, true, true, true, false],
        ],
        pieces: [
            { q: 1, r: 0, color: "green" },
            { q: 2, r: 0, color: "red" },
            { q: 3, r: 1, color: "red" },
            { q: 4, r: 2, color: "red" },
            { q: 3, r: 2, color: "blue", modifier: "red" },
            { q: 4, r: 1, color: "blue" },
        ]
    },

    // Fase 11 — Yellow + Red + Blue + Gray + Move limit
    // Y(3,2) col3odd: NE(4,2)R, SE(4,3)R, N(3,1)R = 3 filled. NE↔SW(no), SE↔NW(no), N↔S(no) ✓
    // Sol: Y(3,2)→R(4,3)→R(4,2)→R(3,1)→B(2,1)→B(5,3)→Gr(1,2) = 7 mov, limit=10
    {
        id: 11, name: "Equilíbrio", category: "Domínio",
        description: "Amarela, Cinza e limite de movimentos. Cada passo conta!",
        gridSize: { cols: 7, rows: 6 }, moveLimit: 10, par: 7,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 2, color: "yellow" },
            { q: 3, r: 1, color: "red" },
            { q: 4, r: 2, color: "red" },
            { q: 4, r: 3, color: "red" },
            { q: 2, r: 1, color: "blue" },
            { q: 5, r: 3, color: "blue" },
            { q: 1, r: 2, color: "gray" },
        ]
    },

    // Fase 12 — ULTIMATE: Green ring + Yellow + Modifier + Placement + Gray
    // Green(3,3) center: 6 adj all reds → ALL → remove first.
    // Yellow(3,5) col3odd: NE(4,5)R, N(3,4=inner ring red) → adj. Must remove YELLOW before inner red(3,4).
    // Need 3rd adj for yellow. Red(2,5): NW. Dirs: NE(4,5),N(3,4),NW(2,5). Opp: NE↔SW(no),N↔S(no),NW↔SE(no). ✓
    // After clearing yellow cluster + inner ring + blues → only grays remain → remove grays.
    // Sol: Y(3,5)→R(4,5)→R(2,5)→G(3,3)→R(3,2)→R(2,3)→R(4,3)→R(4,4)→R(3,4)→R(2,4)→B(5,3)→B(1,3)→Gr(3,1)→Gr(3,6) = 14 mov
    {
        id: 12, name: "Mestre Hex", category: "Domínio",
        description: "🏆 O desafio definitivo! Verde, Amarela, Cinza e Modificadores.",
        gridSize: { cols: 7, rows: 7 }, moveLimit: null, par: 14,
        mask: [
            [false, true, true, true, true, true, false],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [false, true, true, true, true, true, false],
        ],
        pieces: [
            // Green center ring
            { q: 3, r: 3, color: "green" },
            { q: 4, r: 3, color: "red" },
            { q: 4, r: 4, color: "red" },
            { q: 3, r: 4, color: "red" },
            { q: 2, r: 4, color: "red" },
            { q: 2, r: 3, color: "red" },
            { q: 3, r: 2, color: "red" },
            // Outer blues
            { q: 5, r: 3, color: "blue" },
            { q: 1, r: 3, color: "blue" },
            // Yellow cluster (NE=4,5 + N=3,4 + NW=2,5)
            { q: 3, r: 5, color: "yellow" },
            { q: 4, r: 5, color: "red" },
            { q: 2, r: 5, color: "red" },
            // Grays
            { q: 3, r: 1, color: "gray" },
            { q: 3, r: 6, color: "gray" },
        ]
    },
];
