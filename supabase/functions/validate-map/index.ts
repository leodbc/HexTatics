import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const VALID_COLORS = ["red", "blue", "green", "orange", "yellow", "purple", "white", "gray", "black"];
const TITLE_REGEX = /^[\p{L}\p{N}\s.,!?()-]{3,40}$/u;

function sanitizeText(input = "") {
  return String(input).replace(/<[^>]*>/g, "").trim();
}

function validateLevelPayload(level: any) {
  const errors: string[] = [];
  if (!level?.gridSize || level.gridSize.cols < 2 || level.gridSize.cols > 12 || level.gridSize.rows < 2 || level.gridSize.rows > 10) {
    errors.push("gridSize inválido");
  }
  if (!Array.isArray(level?.mask) || level.mask.length !== level.gridSize?.rows) {
    errors.push("mask inválida");
  }
  if (!Array.isArray(level?.pieces) || level.pieces.length === 0 || level.pieces.length > 50) {
    errors.push("pieces inválido (0-50)");
  }

  for (const piece of level?.pieces || []) {
    if (!Number.isInteger(piece.q) || !Number.isInteger(piece.r)) errors.push("coordenada inválida");
    if (!VALID_COLORS.includes(piece.color)) errors.push(`cor inválida: ${piece.color}`);
    if (piece.modifier && !VALID_COLORS.includes(piece.modifier)) errors.push("modifier inválido");
    if (piece.q < 0 || piece.q >= level.gridSize?.cols || piece.r < 0 || piece.r >= level.gridSize?.rows) {
      errors.push("peça fora do grid");
    }
  }

  if (level.moveLimit !== null && level.moveLimit !== undefined) {
    if (!Number.isInteger(level.moveLimit) || level.moveLimit < 1 || level.moveLimit > 99) {
      errors.push("moveLimit inválido");
    }
  }

  if (!Number.isInteger(level.par) || level.par < 1 || level.par > 99) {
    errors.push("par inválido");
  }

  if (JSON.stringify(level).length > 10240) {
    errors.push("payload excede 10KB");
  }

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Método não permitido" }), { status: 405 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ success: false, error: "JSON inválido" }), { status: 400 });
  }

  const title = sanitizeText(body.title || "");
  const authorName = sanitizeText(body.author_name || "Anônimo");

  if (!TITLE_REGEX.test(title)) {
    return new Response(JSON.stringify({ success: false, error: "Título inválido" }), { status: 400 });
  }

  const result = validateLevelPayload(body.level_json);
  if (!result.valid) {
    return new Response(JSON.stringify({ success: false, error: "Payload inválido", details: result.errors }), { status: 400 });
  }

  return new Response(JSON.stringify({
    success: true,
    data: { title, author_name: authorName, level_json: body.level_json },
    error: null,
  }), { status: 200 });
});
