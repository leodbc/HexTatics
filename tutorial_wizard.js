// tutorial_wizard.js — dados do onboarding
window.TUTORIAL_WIZARD = [
    {
        title: "Bem-vindo ao HexTatics",
        text: "Este onboarding em formato wizard usa mini-fases. Em cada etapa, siga o objetivo e aprenda uma regra nova.",
        rule: "Objetivo geral: remova peças respeitando o padrão de cada cor.",
        level: {
            id: "tutorial_intro", name: "Introdução", category: "Tutorial",
            description: "Introdução ao wizard", gridSize: { cols: 3, rows: 2 }, moveLimit: null, par: 1,
            mask: [[true, true, true], [true, true, true]],
            pieces: [{ q: 0, r: 0, color: "red" }]
        },
        actions: []
    },
    {
        title: "Regra Vermelha + Azul",
        text: "Vermelha: 1+ vizinhas (ignorando pretas), mas não todas. Azul: só quando isolada.",
        rule: "Mini-fase: remova a vermelha e depois a azul.",
        level: {
            id: "tutorial_red_blue", name: "Vermelha e Azul", category: "Tutorial",
            description: "Red + Blue", gridSize: { cols: 3, rows: 2 }, moveLimit: null, par: 2,
            mask: [[true, true, true], [true, true, true]],
            pieces: [{ q: 0, r: 0, color: "red" }, { q: 1, r: 0, color: "blue" }]
        },
        actions: [{ type: "remove", q: 0, r: 0 }, { type: "remove", q: 1, r: 0 }]
    },
    {
        title: "Regra Verde",
        text: "A verde sai com pelo menos 2 vizinhas preenchidas e essas vizinhas precisam ser adjacentes entre si.",
        rule: "Mini-fase: remova a peça verde.",
        level: {
            id: "tutorial_green", name: "Verde", category: "Tutorial",
            description: "Green", gridSize: { cols: 3, rows: 2 }, moveLimit: null, par: 1,
            mask: [[true, true, true], [true, true, true]],
            pieces: [{ q: 0, r: 0, color: "green" }, { q: 1, r: 0, color: "red" }, { q: 0, r: 1, color: "blue" }]
        },
        actions: [{ type: "remove", q: 0, r: 0 }]
    },
    {
        title: "Regra Laranja",
        text: "A laranja sai apenas quando todas as casas adjacentes válidas estiverem preenchidas.",
        rule: "Mini-fase: remova a peça laranja.",
        level: {
            id: "tutorial_orange", name: "Laranja", category: "Tutorial",
            description: "Orange", gridSize: { cols: 3, rows: 2 }, moveLimit: null, par: 1,
            mask: [[true, true, true], [true, true, true]],
            pieces: [{ q: 0, r: 0, color: "orange" }, { q: 1, r: 0, color: "red" }, { q: 0, r: 1, color: "blue" }]
        },
        actions: [{ type: "remove", q: 0, r: 0 }]
    },
    {
        title: "Regra Amarela",
        text: "A amarela precisa de exatamente 3 vizinhas (ignorando pretas), sem pares opostos.",
        rule: "Mini-fase: remova a amarela no centro.",
        level: {
            id: "tutorial_yellow", name: "Amarela", category: "Tutorial",
            description: "Yellow", gridSize: { cols: 3, rows: 3 }, moveLimit: null, par: 1,
            mask: [[true, true, true], [true, true, true], [true, true, true]],
            pieces: [
                { q: 1, r: 1, color: "yellow" },
                { q: 2, r: 1, color: "red" },
                { q: 2, r: 2, color: "blue" },
                { q: 1, r: 0, color: "green" }
            ]
        },
        actions: [{ type: "remove", q: 1, r: 1 }]
    },
    {
        title: "Regra Roxa",
        text: "A roxa precisa de exatamente 2 vizinhas opostas (ignorando pretas).",
        rule: "Mini-fase: remova a roxa.",
        level: {
            id: "tutorial_purple", name: "Roxa", category: "Tutorial",
            description: "Purple", gridSize: { cols: 3, rows: 3 }, moveLimit: null, par: 1,
            mask: [[true, true, true], [true, true, true], [true, true, true]],
            pieces: [{ q: 1, r: 1, color: "purple" }, { q: 1, r: 0, color: "red" }, { q: 1, r: 2, color: "blue" }]
        },
        actions: [{ type: "remove", q: 1, r: 1 }]
    },
    {
        title: "Regra Branca",
        text: "A branca só pode sair quando sua mão não possui peças de outras cores.",
        rule: "Mini-fase: remova a branca antes das outras peças.",
        level: {
            id: "tutorial_white", name: "Branca", category: "Tutorial",
            description: "White", gridSize: { cols: 4, rows: 2 }, moveLimit: null, par: 1,
            mask: [[true, true, true, true], [true, true, true, true]],
            pieces: [{ q: 0, r: 0, color: "white" }, { q: 2, r: 0, color: "red" }, { q: 3, r: 0, color: "blue" }]
        },
        actions: [{ type: "remove", q: 0, r: 0 }]
    },
    {
        title: "Regra Cinza Dinâmica",
        text: "A cinza copia regra e modificador da última peça removida.",
        rule: "Mini-fase: remova a azul e depois a cinza.",
        level: {
            id: "tutorial_gray", name: "Cinza", category: "Tutorial",
            description: "Gray", gridSize: { cols: 4, rows: 2 }, moveLimit: null, par: 2,
            mask: [[true, true, true, true], [true, true, true, true]],
            pieces: [{ q: 0, r: 0, color: "blue" }, { q: 2, r: 0, color: "gray" }]
        },
        actions: [{ type: "remove", q: 0, r: 0 }, { type: "remove", q: 2, r: 0 }]
    },
    {
        title: "Regra Preta",
        text: "A preta funciona como parede imóvel: só sai quando só restarem pretas no tabuleiro.",
        rule: "Mini-fase: limpe as outras e remova a preta por último.",
        level: {
            id: "tutorial_black", name: "Preta", category: "Tutorial",
            description: "Black", gridSize: { cols: 4, rows: 2 }, moveLimit: null, par: 3,
            mask: [[true, true, true, true], [true, true, true, true]],
            pieces: [{ q: 0, r: 0, color: "red" }, { q: 1, r: 0, color: "blue" }, { q: 3, r: 1, color: "black" }]
        },
        actions: [{ type: "remove", q: 0, r: 0 }, { type: "remove", q: 1, r: 0 }, { type: "remove", q: 3, r: 1 }]
    },
    {
        title: "Mão + Reposição",
        text: "Peças removidas vão para a mão. Você pode recolocar em uma casa vazia para destravar padrões.",
        rule: "Mini-fase: remova a vermelha, coloque em (0,1) e remova a verde.",
        level: {
            id: "tutorial_hand", name: "Mão", category: "Tutorial",
            description: "Hand", gridSize: { cols: 4, rows: 3 }, moveLimit: null, par: 3,
            mask: [[true, true, true, true], [true, true, true, true], [true, true, true, true]],
            pieces: [
                { q: 0, r: 0, color: "green" },
                { q: 1, r: 0, color: "red" },
                { q: 2, r: 0, color: "red" },
                { q: 2, r: 1, color: "blue" }
            ]
        },
        actions: [{ type: "remove", q: 2, r: 0 }, { type: "place", q: 0, r: 1 }, { type: "remove", q: 0, r: 0 }]
    },
    {
        title: "Modificadores de Cor",
        text: "Com modificador, apenas aquela cor conta para a regra da peça.",
        rule: "Mini-fase: remova a vermelha com modificador azul e conclua o tutorial.",
        level: {
            id: "tutorial_modifier", name: "Modificadores", category: "Tutorial",
            description: "Modifier", gridSize: { cols: 4, rows: 3 }, moveLimit: null, par: 1,
            mask: [[true, true, true, true], [true, true, true, true], [true, true, true, true]],
            pieces: [{ q: 1, r: 1, color: "red", modifier: "blue" }, { q: 0, r: 1, color: "blue" }, { q: 2, r: 1, color: "blue" }]
        },
        actions: [{ type: "remove", q: 1, r: 1 }]
    }
];
