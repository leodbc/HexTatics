// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type LevelPayload = {
  id?: string | number;
  name?: string;
  category?: string;
  description?: string;
  gridSize: { cols: number; rows: number };
  moveLimit?: number | null;
  par: number;
  mask: boolean[][];
  pieces: Array<{ q: number; r: number; color: string; modifier?: string | null }>;
  custom?: boolean;
  pieceCount?: number;
};

const VALID_COLORS = ["red", "blue", "green", "orange", "yellow", "purple", "white", "gray", "black"];
const TITLE_REGEX = /^[\p{L}\p{N}\s.,!?()-]{3,40}$/u;
const AUTHOR_REGEX = /^[\p{L}\p{N}\s.,!?()-]{1,20}$/u;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

function ok(data: unknown, next_cursor: string | null = null, status = 200) {
  return new Response(JSON.stringify({ success: true, data, error: null, next_cursor }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: string, status = 400, details: unknown = null) {
  return new Response(JSON.stringify({ success: false, data: null, error, details, next_cursor: null }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeText(input = "") {
  return String(input).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry as JsonValue));
  }
  if (value && typeof value === "object") {
    const sorted = Object.keys(value)
      .sort()
      .reduce((acc: Record<string, JsonValue>, key) => {
        acc[key] = canonicalize((value as Record<string, JsonValue>)[key]);
        return acc;
      }, {});
    return sorted;
  }
  return value;
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validateLevelPayload(level: LevelPayload) {
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

async function recalcHotScore(supabase: ReturnType<typeof createClient>, mapId: string) {
  const mapRes = await supabase
    .from("maps")
    .select("id, likes_count, created_at")
    .eq("id", mapId)
    .single();

  if (mapRes.error || !mapRes.data) return;

  const statsRes = await supabase
    .from("map_stats")
    .select("total_starts, total_wins")
    .eq("map_id", mapId)
    .maybeSingle();

  const likes = Number(mapRes.data.likes_count || 0);
  const starts = Number(statsRes.data?.total_starts || 0);
  const wins = Number(statsRes.data?.total_wins || 0);
  const createdAt = new Date(mapRes.data.created_at).getTime();
  const hoursSince = Math.max(0, (Date.now() - createdAt) / 36e5);
  const score = (likes * 2 + starts + wins * 3) / Math.pow(hoursSince + 24, 1.2);

  await supabase
    .from("maps")
    .update({ hot_score: Number.isFinite(score) ? score : 0 })
    .eq("id", mapId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return fail("Configuração do servidor ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)", 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const deviceId = req.headers.get("x-device-id") || "";

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "v1") {
    return fail("Rota inválida", 404);
  }

  try {
    // POST /v1/maps
    if (req.method === "POST" && parts.length === 2 && parts[1] === "maps") {
      if (!deviceId) return fail("X-Device-ID obrigatório", 400);

      const body = await req.json().catch(() => null);
      if (!body) return fail("JSON inválido", 400);

      const level = body.level_json as LevelPayload;
      const title = sanitizeText(body.title || "");
      const authorNameRaw = sanitizeText(body.author_name || "Anônimo");
      const authorName = authorNameRaw || "Anônimo";

      if (!TITLE_REGEX.test(title)) return fail("Título inválido", 400);
      if (!AUTHOR_REGEX.test(authorName)) return fail("Nickname inválido", 400);

      const validation = validateLevelPayload(level);
      if (!validation.valid) return fail("Payload inválido", 400, validation.errors);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const rateRes = await supabase
        .from("maps")
        .select("id", { count: "exact", head: true })
        .eq("device_id", deviceId)
        .gte("created_at", since);

      if (rateRes.error) return fail("Falha ao verificar limite", 500);
      if ((rateRes.count || 0) >= 10) return fail("Muitas publicações hoje. Tente novamente amanhã.", 429);

      const canonicalLevel = canonicalize(level as unknown as JsonValue);
      const levelHash = await sha256Hex(JSON.stringify(canonicalLevel));

      const dupRes = await supabase
        .from("maps")
        .select("id")
        .eq("level_hash", levelHash)
        .in("status", ["public", "hidden"])
        .limit(1)
        .maybeSingle();

      if (dupRes.error && dupRes.error.code !== "PGRST116") {
        return fail("Falha ao verificar duplicidade", 500);
      }
      if (dupRes.data?.id) {
        return fail("Este mapa já foi publicado antes.", 409);
      }

      const pieceCount = level.pieceCount || level.pieces.length;
      const insertRes = await supabase
        .from("maps")
        .insert({
          title,
          description: String(level.description || ""),
          author_name: authorName,
          device_id: deviceId,
          level_json: level,
          level_hash: levelHash,
          grid_cols: level.gridSize.cols,
          grid_rows: level.gridSize.rows,
          piece_count: pieceCount,
          status: "public",
        })
        .select("id, slug, title, author_name, likes_count, created_at")
        .single();

      if (insertRes.error) return fail(insertRes.error.message || "Erro ao publicar", 500);

      await recalcHotScore(supabase, insertRes.data.id);
      return ok(insertRes.data, null, 201);
    }

    // GET /v1/maps
    if (req.method === "GET" && parts.length === 2 && parts[1] === "maps") {
      const rawTab = url.searchParams.get("tab") || "recent";
      const tab = ["hot", "mine", "recent"].includes(rawTab) ? rawTab : "recent";
      const cursor = url.searchParams.get("cursor");
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));

      let query = supabase
        .from("maps")
        .select("id, slug, title, author_name, likes_count, piece_count, grid_cols, grid_rows, level_json, created_at, hot_score");

      if (tab === "mine") {
        if (!deviceId) return fail("X-Device-ID obrigatório para tab=mine", 400);
        query = query.eq("device_id", deviceId);
      } else {
        query = query.eq("status", "public");
      }

      query = query.limit(limit + 1);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      query = tab === "hot"
        ? query.order("hot_score", { ascending: false }).order("created_at", { ascending: false })
        : query.order("created_at", { ascending: false });

      const feedRes = await query;
      if (feedRes.error) return fail(feedRes.error.message || "Erro ao carregar feed", 500);

      const rows = feedRes.data || [];
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const mapIds = page.map((m) => m.id);

      let likedSet = new Set<string>();
      if (deviceId && mapIds.length) {
        const likesRes = await supabase
          .from("map_votes")
          .select("map_id")
          .eq("device_id", deviceId)
          .in("map_id", mapIds);
        if (!likesRes.error) {
          likedSet = new Set((likesRes.data || []).map((row) => row.map_id as string));
        }
      }

      const statsRes = mapIds.length
        ? await supabase.from("map_stats").select("map_id, win_rate").in("map_id", mapIds)
        : { data: [], error: null };

      const statsMap = new Map<string, number>();
      if (!statsRes.error) {
        for (const row of (statsRes.data || [])) {
          statsMap.set(String(row.map_id), Number(row.win_rate || 0));
        }
      }

      const data = page.map((row) => ({
        ...row,
        win_rate: statsMap.get(String(row.id)) || 0,
        liked_by_me: likedSet.has(String(row.id)),
      }));

      const nextCursor = hasMore ? String(page[page.length - 1]?.created_at || "") : null;
      return ok(data, nextCursor || null, 200);
    }

    // GET /v1/maps/:idOrSlug
    if (req.method === "GET" && parts.length === 3 && parts[1] === "maps") {
      const idOrSlug = decodeURIComponent(parts[2]);

      let mapRes = await supabase
        .from("maps")
        .select("id, slug, title, author_name, likes_count, piece_count, grid_cols, grid_rows, level_json, created_at, status")
        .eq("id", idOrSlug)
        .eq("status", "public")
        .maybeSingle();

      if (!mapRes.data) {
        mapRes = await supabase
          .from("maps")
          .select("id, slug, title, author_name, likes_count, piece_count, grid_cols, grid_rows, level_json, created_at, status")
          .eq("slug", idOrSlug)
          .eq("status", "public")
          .maybeSingle();
      }

      if (mapRes.error) return fail(mapRes.error.message || "Erro ao buscar mapa", 500);
      if (!mapRes.data) return fail("Mapa não encontrado", 404);

      const [statsRes, likedRes] = await Promise.all([
        supabase.from("map_stats").select("win_rate").eq("map_id", mapRes.data.id).maybeSingle(),
        deviceId
          ? supabase.from("map_votes").select("id").eq("map_id", mapRes.data.id).eq("device_id", deviceId).limit(1)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const data = {
        ...mapRes.data,
        win_rate: Number(statsRes.data?.win_rate || 0),
        liked_by_me: !!(Array.isArray(likedRes.data) && likedRes.data.length),
      };

      return ok(data);
    }

    // POST /v1/maps/:id/like
    if (req.method === "POST" && parts.length === 4 && parts[1] === "maps" && parts[3] === "like") {
      if (!deviceId) return fail("X-Device-ID obrigatório", 400);
      const mapId = decodeURIComponent(parts[2]);

      const mapCheck = await supabase.from("maps").select("id, likes_count, status").eq("id", mapId).maybeSingle();
      if (mapCheck.error) return fail("Erro ao validar mapa", 500);
      if (!mapCheck.data || mapCheck.data.status !== "public") return fail("Mapa não encontrado", 404);

      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const likeRate = await supabase
        .from("map_votes")
        .select("id", { count: "exact", head: true })
        .eq("device_id", deviceId)
        .gte("created_at", since);
      if (likeRate.error) return fail("Falha ao verificar limite", 500);

      const existing = await supabase
        .from("map_votes")
        .select("id")
        .eq("map_id", mapId)
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existing.error && existing.error.code !== "PGRST116") return fail("Erro ao processar curtida", 500);

      let liked = false;
      let likesCount = Number(mapCheck.data.likes_count || 0);

      if (existing.data?.id) {
        const del = await supabase.from("map_votes").delete().eq("id", existing.data.id);
        if (del.error) return fail("Erro ao remover curtida", 500);
        likesCount = Math.max(0, likesCount - 1);
        const upd = await supabase.from("maps").update({ likes_count: likesCount }).eq("id", mapId);
        if (upd.error) return fail("Erro ao atualizar contador", 500);
        liked = false;
      } else {
        if ((likeRate.count || 0) >= 50) return fail("Limite de curtidas por hora excedido", 429);
        const ins = await supabase.from("map_votes").insert({ map_id: mapId, device_id: deviceId });
        if (ins.error) return fail("Erro ao curtir mapa", 500);
        likesCount = likesCount + 1;
        const upd = await supabase.from("maps").update({ likes_count: likesCount }).eq("id", mapId);
        if (upd.error) return fail("Erro ao atualizar contador", 500);
        liked = true;
      }

      await recalcHotScore(supabase, mapId);
      return ok({ liked, likes_count: likesCount });
    }

    // POST /v1/maps/:id/report
    if (req.method === "POST" && parts.length === 4 && parts[1] === "maps" && parts[3] === "report") {
      if (!deviceId) return fail("X-Device-ID obrigatório", 400);
      const mapId = decodeURIComponent(parts[2]);
      const body = await req.json().catch(() => null);
      if (!body) return fail("JSON inválido", 400);

      const validReasons = ["spam", "inappropriate", "impossible", "other"];
      const reason = String(body.reason || "");
      const detail = sanitizeText(String(body.detail || "")).slice(0, 120);
      if (!validReasons.includes(reason)) return fail("Motivo inválido", 400);

      const mapCheck = await supabase.from("maps").select("id, status").eq("id", mapId).maybeSingle();
      if (mapCheck.error) return fail("Erro ao validar mapa", 500);
      if (!mapCheck.data || !["public", "hidden"].includes(mapCheck.data.status)) return fail("Mapa não encontrado", 404);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const reportRate = await supabase
        .from("map_reports")
        .select("id", { count: "exact", head: true })
        .eq("device_id", deviceId)
        .gte("created_at", since);
      if (reportRate.error) return fail("Falha ao verificar limite", 500);
      if ((reportRate.count || 0) >= 10) return fail("Limite de denúncias diário excedido", 429);

      const ins = await supabase
        .from("map_reports")
        .insert({ map_id: mapId, device_id: deviceId, reason, detail });

      if (ins.error) {
        if (ins.error.code === "23505") return fail("Você já denunciou este mapa.", 409);
        return fail("Não foi possível enviar a denúncia.", 500);
      }

      await recalcHotScore(supabase, mapId);
      return ok({ reported: true });
    }

    // POST /v1/maps/:id/run-start
    if (req.method === "POST" && parts.length === 4 && parts[1] === "maps" && parts[3] === "run-start") {
      if (!deviceId) return fail("X-Device-ID obrigatório", 400);
      const mapId = decodeURIComponent(parts[2]);

      const mapCheck = await supabase.from("maps").select("id, status").eq("id", mapId).maybeSingle();
      if (mapCheck.error) return fail("Erro ao validar mapa", 500);
      if (!mapCheck.data || mapCheck.data.status !== "public") return fail("Mapa não encontrado", 404);

      const ins = await supabase
        .from("map_runs")
        .insert({ map_id: mapId, device_id: deviceId, won: false })
        .select("id")
        .single();

      if (ins.error) return fail("Erro ao registrar início da partida", 500);
      await recalcHotScore(supabase, mapId);
      return ok({ run_id: ins.data.id });
    }

    // POST /v1/maps/:id/run-complete
    if (req.method === "POST" && parts.length === 4 && parts[1] === "maps" && parts[3] === "run-complete") {
      if (!deviceId) return fail("X-Device-ID obrigatório", 400);
      const mapId = decodeURIComponent(parts[2]);
      const body = await req.json().catch(() => null);
      if (!body) return fail("JSON inválido", 400);

      const runId = body.run_id ? Number(body.run_id) : null;
      const moves = Number(body.moves ?? 0);
      const timeSeconds = Number(body.time_seconds ?? 0);
      const won = !!body.won;

      if (!Number.isFinite(moves) || moves < 0 || moves > 9999) return fail("moves inválido", 400);
      if (!Number.isFinite(timeSeconds) || timeSeconds < 0 || timeSeconds > 86400) return fail("time_seconds inválido", 400);

      if (runId) {
        const upd = await supabase
          .from("map_runs")
          .update({ completed_at: new Date().toISOString(), moves, time_seconds: timeSeconds, won })
          .eq("id", runId)
          .eq("map_id", mapId)
          .eq("device_id", deviceId)
          .select("id")
          .maybeSingle();

        if (upd.error) return fail("Erro ao registrar fim da partida", 500);
        if (!upd.data) return fail("run_id inválido", 404);
      } else {
        const ins = await supabase
          .from("map_runs")
          .insert({
            map_id: mapId,
            device_id: deviceId,
            completed_at: new Date().toISOString(),
            moves,
            time_seconds: timeSeconds,
            won,
          });
        if (ins.error) return fail("Erro ao registrar fim da partida", 500);
      }

      await recalcHotScore(supabase, mapId);
      return ok({ completed: true });
    }

    // DELETE /v1/maps/:id  -- allow the creator (device_id) to remove their own map
    if (req.method === "DELETE" && parts.length === 3 && parts[1] === "maps") {
      if (!deviceId) return fail("X-Device-ID obrigatório", 400);
      const mapId = decodeURIComponent(parts[2]);

      const mapRes = await supabase.from("maps").select("id, device_id, status").eq("id", mapId).maybeSingle();
      if (mapRes.error) return fail("Erro ao validar mapa", 500);
      if (!mapRes.data) return fail("Mapa não encontrado", 404);

      // Only the original device that published the map may remove it
      if (String(mapRes.data.device_id) !== String(deviceId)) return fail("Não autorizado", 403);

      // Soft-delete: mark as 'rejected' so it leaves the public feed
      const upd = await supabase.from("maps").update({ status: "rejected" }).eq("id", mapId);
      if (upd.error) return fail("Erro ao remover mapa", 500);

      // also recalc hot score asynchronously
      try { await recalcHotScore(supabase, mapId); } catch (_) { /* ignore */ }
      return ok({ deleted: true });
    }

    return fail("Rota não encontrada", 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return fail(message, 500);
  }
});
