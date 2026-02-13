import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Método não permitido" }), { status: 405 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.level_json) {
    return new Response(JSON.stringify({ success: false, error: "level_json obrigatório" }), { status: 400 });
  }

  return new Response(JSON.stringify({
    success: true,
    data: {
      solvable: null,
      verified: false,
      reason: "solver_not_enabled",
    },
    error: null,
  }), { status: 200 });
});
