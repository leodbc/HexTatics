const assert = require("assert");

function validateLevelPayload(level) {
  const errors = [];
  if (!level?.gridSize || level.gridSize.cols < 2 || level.gridSize.cols > 12 || level.gridSize.rows < 2 || level.gridSize.rows > 10) errors.push("gridSize inválido");
  if (!Array.isArray(level?.mask) || level.mask.length !== level.gridSize?.rows) errors.push("mask inválida");
  if (!Array.isArray(level?.pieces) || level.pieces.length === 0 || level.pieces.length > 50) errors.push("pieces inválido (0-50)");
  const validColors = ["red", "blue", "green", "orange", "yellow", "purple", "white", "gray", "black"];
  for (const p of level?.pieces || []) {
    if (!Number.isInteger(p.q) || !Number.isInteger(p.r)) errors.push("coordenada inválida");
    if (!validColors.includes(p.color)) errors.push("cor inválida");
    if (p.modifier && !validColors.includes(p.modifier)) errors.push("modifier inválido");
    if (p.q < 0 || p.q >= level.gridSize.cols || p.r < 0 || p.r >= level.gridSize.rows) errors.push("peça fora do grid");
  }
  if (level.moveLimit !== null && level.moveLimit !== undefined) {
    if (!Number.isInteger(level.moveLimit) || level.moveLimit < 1 || level.moveLimit > 99) errors.push("moveLimit inválido");
  }
  if (!Number.isInteger(level.par) || level.par < 1 || level.par > 99) errors.push("par inválido");
  if (JSON.stringify(level).length > 10240) errors.push("payload excede 10KB");
  return { valid: errors.length === 0, errors };
}

function makeValidLevel() {
  return {
    name: "Teste",
    gridSize: { cols: 5, rows: 4 },
    moveLimit: null,
    par: 5,
    mask: [
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [true, true, true, true, true],
    ],
    pieces: [
      { q: 0, r: 0, color: "red" },
      { q: 2, r: 1, color: "blue" },
    ],
  };
}

(function run() {
  const valid = makeValidLevel();
  let result = validateLevelPayload(valid);
  assert.strictEqual(result.valid, true, "Mapa válido deve passar");

  const tooManyPieces = makeValidLevel();
  tooManyPieces.pieces = Array.from({ length: 51 }, (_, i) => ({ q: i % 5, r: Math.floor(i / 5), color: "red" }));
  result = validateLevelPayload(tooManyPieces);
  assert.strictEqual(result.valid, false, "Mais de 50 peças deve falhar");

  const invalidColor = makeValidLevel();
  invalidColor.pieces[0].color = "pink";
  result = validateLevelPayload(invalidColor);
  assert.strictEqual(result.valid, false, "Cor inválida deve falhar");

  const invalidGrid = makeValidLevel();
  invalidGrid.gridSize.cols = 20;
  result = validateLevelPayload(invalidGrid);
  assert.strictEqual(result.valid, false, "Grid inválido deve falhar");

  console.log("All tests passed.");
})();
