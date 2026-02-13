# API Spec — Comunidade de Mapas (v1)

## Base URL
- https://<supabase-project>.functions.supabase.co/v1

## Headers
- Content-Type: application/json
- X-Device-ID: <uuid-v4>

## Envelope padrão
{
  "success": true,
  "data": {},
  "error": null,
  "next_cursor": null
}

## Endpoints

### POST /maps
Publica um mapa.
- body: { title, author_name, level_json }
- respostas: 201, 400, 409 (duplicata), 429 (rate-limit)

### GET /maps?tab=recent|hot&cursor=<iso>&limit=20
Lista mapas públicos.
- resposta: data[] + next_cursor

### GET /maps/:id
Busca mapa por id ou slug.

### POST /maps/:id/like
Toggle de curtida por device.
- resposta: { liked: boolean, likes_count: number }

### POST /maps/:id/report
Registra denúncia.
- body: { reason, detail? }

### POST /maps/:id/run-start
Registra início da partida.
- resposta: { run_id }

### POST /maps/:id/run-complete
Registra término.
- body: { run_id, moves, time_seconds, won }

## Erros comuns
- 400: payload inválido
- 404: mapa não encontrado
- 409: conflito (duplicata, voto repetido sem toggle)
- 429: limite excedido
- 500: falha interna
