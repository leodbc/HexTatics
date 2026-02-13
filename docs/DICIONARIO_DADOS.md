# Dicionário de Dados — Comunidade de Mapas

## maps
- id (text, PK): id curto alfanumérico.
- slug (text, unique): identificador amigável para URL.
- title (text): título do mapa (3–40).
- description (text): descrição curta.
- author_name (text): nickname opcional.
- device_id (text): identificador do dispositivo publicador.
- level_json (jsonb): payload completo do mapa.
- level_hash (text): hash SHA-256 do payload canônico.
- grid_cols (smallint): colunas.
- grid_rows (smallint): linhas.
- piece_count (smallint): quantidade de peças.
- status (text): draft|public|hidden|rejected.
- likes_count (int): contador agregado de curtidas.
- report_count (int): contador agregado de denúncias.
- hot_score (float): score para ranking Em Alta.
- created_at (timestamptz): criação.
- updated_at (timestamptz): atualização.

## map_votes
- id (bigserial, PK).
- map_id (text, FK maps.id).
- device_id (text).
- created_at (timestamptz).
- unique(map_id, device_id).

## map_reports
- id (bigserial, PK).
- map_id (text, FK maps.id).
- device_id (text).
- reason (text): spam|inappropriate|impossible|other.
- detail (text): detalhe opcional.
- created_at (timestamptz).
- unique(map_id, device_id).

## map_runs
- id (bigserial, PK).
- map_id (text, FK maps.id).
- device_id (text).
- started_at (timestamptz).
- completed_at (timestamptz, nullable).
- moves (int, nullable).
- time_seconds (int, nullable).
- won (boolean).

## map_stats (view)
- map_id.
- total_starts.
- total_wins.
- avg_moves.
- avg_time.
- win_rate.
