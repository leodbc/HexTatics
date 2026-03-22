const LEVELS = [

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

    {
        id: 3, name: "Fase 3 - Mão", category: "Personalizada",
        description: "8♦ 2● · 🕳️",
        gridSize: { cols: 6, rows: 5 }, moveLimit: null, par: 10,
        mask: [
            [false, false, false, true, true, true],
            [false, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
        ],
        pieces: [
            { q: 4, r: 1, color: "red" },
            { q: 3, r: 2, color: "red" },
            { q: 4, r: 2, color: "blue" },
            { q: 5, r: 2, color: "red" },
            { q: 0, r: 3, color: "red" },
            { q: 2, r: 3, color: "red" },
            { q: 3, r: 3, color: "blue" },
            { q: 4, r: 3, color: "red" },
            { q: 0, r: 4, color: "red" },
            { q: 3, r: 4, color: "red" },
        ]
    },

    {
        id: 4, name: "Reposição", category: "Estratégia",
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

    {
        id: 5, name: "Fase 5 - Triângulo dourado", category: "Personalizada",
        description: "1● 1▲ 2♦ · 🕳️",
        gridSize: { cols: 4, rows: 4 }, moveLimit: null, par: 4,
        mask: [
            [false, false, false, false],
            [false, true, true, true],
            [true, true, true, true],
            [true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 1, color: "blue" },
            { q: 1, r: 2, color: "yellow" },
            { q: 2, r: 2, color: "red" },
            { q: 2, r: 3, color: "red" },
        ]
    },

    {
        id: 6, name: "Fase 6 - Modificadores", category: "Personalizada",
        description: "4♦ 1● 1▲ · 🔄🕳️",
        gridSize: { cols: 6, rows: 4 }, moveLimit: null, par: 6,
        mask: [
            [false, true, false, true, false, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
        ],
        pieces: [
            { q: 1, r: 2, color: "red", modifier: "blue" },
            { q: 3, r: 2, color: "red" },
            { q: 1, r: 1, color: "red" },
            { q: 3, r: 1, color: "blue" },
            { q: 4, r: 2, color: "yellow" },
            { q: 5, r: 1, color: "red" },
        ]
    },

    {
        id: 7, name: "Fase 7 - Parede preta", category: "Personalizada",
        description: "2▲ 2⬢ 1♦ 1● 1■",
        gridSize: { cols: 6, rows: 4 }, moveLimit: null, par: 8,
        mask: [
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
        ],
        pieces: [
            { q: 2, r: 2, color: "yellow" },
            { q: 3, r: 1, color: "black" },
            { q: 3, r: 2, color: "black" },
            { q: 4, r: 2, color: "red" },
            { q: 4, r: 1, color: "blue" },
            { q: 5, r: 1, color: "yellow" },
            { q: 3, r: 0, color: "green" },
        ]
    },

    {
        id: 8, name: "Fase 8 - Abraço", category: "Personalizada",
        description: "1■ 2● 3♦ 1⬢ · 🔄🕳️",
        gridSize: { cols: 5, rows: 5 }, moveLimit: null, par: 6,
        mask: [
            [false, true, true, true, false],
            [true, true, true, true, true],
            [false, true, true, true, false],
            [true, true, true, true, true],
            [true, true, true, false, false],
        ],
        pieces: [
            { q: 2, r: 0, color: "green", modifier: "blue" },
            { q: 3, r: 2, color: "blue" },
            { q: 2, r: 3, color: "red" },
            { q: 3, r: 3, color: "blue", modifier: "red" },
            { q: 2, r: 4, color: "red" },
            { q: 4, r: 1, color: "red", modifier: "blue" },
            { q: 2, r: 1, color: "black", modifier: "red" },
        ]
    },

    {
        id: 9, name: "Fase 9 - Laranja legal", category: "Personalizada",
        description: "6♦ 1⬟ 1● 1▲ · 🔄🕳️",
        gridSize: { cols: 5, rows: 4 }, moveLimit: null, par: 9,
        mask: [
            [false, false, false, false, false],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
        ],
        pieces: [
            { q: 0, r: 2, color: "red" },
            { q: 1, r: 2, color: "orange" },
            { q: 2, r: 2, color: "red" },
            { q: 4, r: 2, color: "red", modifier: "blue" },
            { q: 0, r: 3, color: "red" },
            { q: 1, r: 3, color: "blue" },
            { q: 2, r: 3, color: "yellow" },
            { q: 3, r: 3, color: "red", modifier: "blue" },
            { q: 4, r: 3, color: "red" },
        ]
    },

    {
        id: 10, name: "Fase 10 - Trapézio", category: "Personalizada",
        description: "3♦ 1⬟ 1■ 1● 1⬢ 1▲ · 🕳️",
        gridSize: { cols: 6, rows: 6 }, moveLimit: null, par: 8,
        mask: [
            [false, false, false, false, false, false],
            [false, true, true, true, true, true],
            [false, true, true, true, true, true],
            [false, true, true, true, true, true],
            [false, true, true, true, true, true],
            [false, false, true, true, true, false],
        ],
        pieces: [
            { q: 2, r: 2, color: "red" },
            { q: 3, r: 2, color: "orange" },
            { q: 4, r: 2, color: "red" },
            { q: 3, r: 3, color: "green" },
            { q: 4, r: 3, color: "blue" },
            { q: 2, r: 4, color: "black" },
            { q: 3, r: 4, color: "red" },
            { q: 4, r: 4, color: "yellow" },
        ]
    },

    {
        id: 11, name: "Fase 11 - Escalada", category: "Personalizada",
        description: "4♦ 3⬟ 1▲ 2● · 🔄",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 10,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 4, color: "red", modifier: "yellow" },
            { q: 3, r: 3, color: "orange" },
            { q: 3, r: 5, color: "orange" },
            { q: 3, r: 1, color: "orange" },
            { q: 3, r: 2, color: "red", modifier: "yellow" },
            { q: 3, r: 0, color: "red", modifier: "yellow" },
            { q: 0, r: 5, color: "yellow" },
            { q: 0, r: 4, color: "blue" },
            { q: 6, r: 5, color: "blue" },
            { q: 1, r: 4, color: "red", modifier: "blue" },
        ]
    },

    {
        id: 12, name: "Fase 12 - Roxo polar", category: "Personalizada",
        description: "2♦ 2✦ 1● 1▲",
        gridSize: { cols: 5, rows: 5 }, moveLimit: null, par: 6,
        mask: [
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 0, color: "red" },
            { q: 3, r: 1, color: "purple" },
            { q: 4, r: 1, color: "red" },
            { q: 2, r: 2, color: "blue" },
            { q: 1, r: 3, color: "yellow" },
            { q: 2, r: 3, color: "purple" },
        ]
    },

    {
        id: 13, name: "Fase 13 - União", category: "Personalizada",
        description: "1⬟ 1▲ 1■ 1● 2✦ 2♦ · 🔄🕳️",
        gridSize: { cols: 6, rows: 5 }, moveLimit: null, par: 8,
        mask: [
            [false, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 1, color: "orange" },
            { q: 0, r: 2, color: "yellow" },
            { q: 2, r: 2, color: "green", modifier: "red" },
            { q: 3, r: 2, color: "blue" },
            { q: 4, r: 2, color: "purple" },
            { q: 2, r: 3, color: "purple" },
            { q: 3, r: 3, color: "red", modifier: "purple" },
            { q: 4, r: 3, color: "red" },
        ]
    },

    {
        id: 14, name: "Fase 14 - Abertura", category: "Personalizada",
        description: "4♦ 1● 1⬟ 1◉ · 🕳️",
        gridSize: { cols: 5, rows: 5 }, moveLimit: null, par: 7,
        mask: [
            [false, false, false, false, false],
            [false, true, true, true, false],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
        ],
        pieces: [
            { q: 2, r: 2, color: "red" },
            { q: 3, r: 2, color: "blue" },
            { q: 1, r: 3, color: "red" },
            { q: 2, r: 3, color: "orange" },
            { q: 3, r: 3, color: "red" },
            { q: 4, r: 3, color: "white" },
            { q: 2, r: 4, color: "red" },
        ]
    },

    {
        id: 15, name: "Fase 15 - Pouco espaço", category: "Personalizada",
        description: "2⬢ 1● 1✦ 1⬟ 1▲ 2♦ · 🔄🕳️",
        gridSize: { cols: 7, rows: 4 }, moveLimit: null, par: 8,
        mask: [
            [false, false, false, true, false, false, false],
            [true, false, false, true, true, true, true],
            [true, false, true, false, true, false, true],
            [true, true, true, true, true, false, false],
        ],
        pieces: [
            { q: 3, r: 0, color: "black" },
            { q: 0, r: 1, color: "blue" },
            { q: 4, r: 1, color: "black" },
            { q: 0, r: 2, color: "purple" },
            { q: 2, r: 2, color: "orange" },
            { q: 4, r: 2, color: "yellow" },
            { q: 0, r: 3, color: "red", modifier: "purple" },
            { q: 1, r: 3, color: "red" },
        ]
    },

    {
        id: 16, name: "Fase 16 - Antecipação", category: "Personalizada",
        description: "1▲ 1⬢ 1◉ 1● 1■ 1✦ 1♦ · 🔄",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 7,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 2, r: 0, color: "yellow" },
            { q: 3, r: 0, color: "black", modifier: "white" },
            { q: 3, r: 2, color: "white" },
            { q: 2, r: 3, color: "blue" },
            { q: 3, r: 3, color: "green" },
            { q: 4, r: 4, color: "purple" },
            { q: 3, r: 4, color: "red" },
        ]
    },

    {
        id: 17, name: "Fase 17 - Chave", category: "Personalizada",
        description: "2✦ 3⬢ 1▲ 1● 1⬟ 1■ 1♦ 1◉ · 🔄",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 11,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 2, r: 3, color: "purple" },
            { q: 3, r: 1, color: "black" },
            { q: 1, r: 3, color: "black", modifier: "purple" },
            { q: 2, r: 4, color: "black", modifier: "green" },
            { q: 4, r: 2, color: "yellow", modifier: "black" },
            { q: 3, r: 2, color: "blue", modifier: "orange" },
            { q: 4, r: 3, color: "orange" },
            { q: 4, r: 4, color: "green" },
            { q: 5, r: 3, color: "red", modifier: "blue" },
            { q: 3, r: 4, color: "white" },
            { q: 1, r: 2, color: "purple" },
        ]
    },

    {
        id: 18, name: "Fase 18 - Escanteio", category: "Personalizada",
        description: "5▲ 1● 1⬟ 1♦",
        gridSize: { cols: 7, rows: 5 }, moveLimit: null, par: 8,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 1, r: 1, color: "yellow" },
            { q: 2, r: 1, color: "yellow" },
            { q: 3, r: 1, color: "yellow" },
            { q: 1, r: 2, color: "yellow" },
            { q: 2, r: 2, color: "blue" },
            { q: 2, r: 3, color: "yellow" },
            { q: 4, r: 3, color: "orange" },
            { q: 5, r: 3, color: "red" },
        ]
    },

    {
        id: 19, name: "Fase 19 - Flexível", category: "Personalizada",
        description: "1▬ 2● 1✦ 1▲ 1■ 2♦ 1⬢ · 🔄",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 8,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 2, r: 2, color: "gray" },
            { q: 3, r: 2, color: "blue" },
            { q: 1, r: 1, color: "blue" },
            { q: 4, r: 2, color: "purple" },
            { q: 4, r: 3, color: "yellow" },
            { q: 4, r: 4, color: "green" },
            { q: 3, r: 4, color: "red", modifier: "red" },
            { q: 5, r: 3, color: "red", modifier: "green" },
            { q: 3, r: 3, color: "black" },
        ]
    },

    {
        id: 20, name: "Fase 20 - Resgate", category: "Personalizada",
        description: "4● 4▲ 3♦ 1⬢ 3⬟ · 🔄",
        gridSize: { cols: 8, rows: 7 }, moveLimit: null, par: 15,
        mask: [
            [true, true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 3, r: 1, color: "blue" },
            { q: 2, r: 2, color: "yellow" },
            { q: 1, r: 2, color: "red", modifier: "red" },
            { q: 3, r: 2, color: "black" },
            { q: 2, r: 3, color: "orange" },
            { q: 1, r: 3, color: "blue", modifier: "orange" },
            { q: 2, r: 4, color: "yellow" },
            { q: 2, r: 5, color: "orange" },
            { q: 3, r: 4, color: "blue", modifier: "blue" },
            { q: 1, r: 5, color: "red", modifier: "yellow" },
            { q: 2, r: 6, color: "yellow", modifier: "yellow" },
            { q: 4, r: 5, color: "red", modifier: "red" },
            { q: 5, r: 5, color: "orange" },
            { q: 5, r: 4, color: "yellow", modifier: "blue" },
            { q: 4, r: 4, color: "blue", modifier: "yellow" },
        ]
    },

    {
        id: 21, name: "Fase 21 - Âncora", category: "Personalizada",
        description: "2♦ 2⬟ 2▲ 3⬢ 1■ 2✦ · 🔄🕳️",
        gridSize: { cols: 7, rows: 8 }, moveLimit: null, par: 12,
        mask: [
            [false, true, true, true, true, true, false],
            [false, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, false],
            [true, true, true, true, true, true, false],
            [false, true, true, true, true, true, false],
        ],
        pieces: [
            { q: 5, r: 0, color: "red" },
            { q: 2, r: 1, color: "orange" },
            { q: 4, r: 1, color: "yellow" },
            { q: 5, r: 1, color: "black" },
            { q: 3, r: 2, color: "black" },
            { q: 4, r: 2, color: "green" },
            { q: 5, r: 2, color: "purple" },
            { q: 1, r: 3, color: "black" },
            { q: 3, r: 3, color: "red", modifier: "black" },
            { q: 1, r: 4, color: "yellow" },
            { q: 4, r: 4, color: "purple" },
            { q: 3, r: 6, color: "orange" },
        ]
    },

    {
        id: 22, name: "Fase 22 - Polimorfo", category: "Personalizada",
        description: "1♦ 1▲ 1✦ 2● 1■ 1▬ · 🔄",
        gridSize: { cols: 6, rows: 5 }, moveLimit: null, par: 7,
        mask: [
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
        ],
        pieces: [
            { q: 1, r: 1, color: "red", modifier: "green" },
            { q: 2, r: 1, color: "yellow" },
            { q: 3, r: 1, color: "purple" },
            { q: 2, r: 2, color: "blue" },
            { q: 2, r: 3, color: "green" },
            { q: 3, r: 3, color: "gray" },
            { q: 4, r: 3, color: "blue" },
        ]
    },

    {
        id: 23, name: "Fase 23 - Prisma", category: "Personalizada",
        description: "1⬢ 1⬟ 1■ 1◉ 1✦ 1▲ 1● 1♦ · 🔄",
        gridSize: { cols: 6, rows: 5 }, moveLimit: null, par: 8,
        mask: [
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
            [true, true, true, true, true, true],
        ],
        pieces: [
            { q: 1, r: 0, color: "black" },
            { q: 1, r: 1, color: "orange" },
            { q: 1, r: 2, color: "green" },
            { q: 3, r: 2, color: "white" },
            { q: 4, r: 2, color: "purple" },
            { q: 2, r: 3, color: "yellow" },
            { q: 3, r: 3, color: "blue" },
            { q: 2, r: 4, color: "red", modifier: "green" },
        ]
    },

    {
        id: 24, name: "Fase 24 - Potencial máximo", category: "Personalizada",
        description: "1◉ 1▲ 2● 1✦ 2⬟ 1■ 3♦ 1⬢ · 🔄",
        gridSize: { cols: 7, rows: 6 }, moveLimit: null, par: 12,
        mask: [
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
            [true, true, true, true, true, true, true],
        ],
        pieces: [
            { q: 5, r: 1, color: "white" },
            { q: 2, r: 3, color: "yellow" },
            { q: 3, r: 2, color: "blue", modifier: "orange" },
            { q: 3, r: 3, color: "blue" },
            { q: 4, r: 4, color: "purple" },
            { q: 3, r: 1, color: "orange" },
            { q: 5, r: 3, color: "orange" },
            { q: 5, r: 2, color: "green" },
            { q: 2, r: 1, color: "red", modifier: "yellow" },
            { q: 3, r: 0, color: "black" },
            { q: 6, r: 4, color: "red", modifier: "purple" },
            { q: 4, r: 1, color: "red", modifier: "purple" },
        ]
    }
];
