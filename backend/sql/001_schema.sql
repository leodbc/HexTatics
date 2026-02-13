-- 001_schema.sql
-- Estrutura principal (rodar após 002_functions.sql ou remover default de id se preferir).

CREATE TABLE IF NOT EXISTS maps (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 40),
    description TEXT DEFAULT '',
    author_name TEXT DEFAULT 'Anônimo' CHECK (char_length(author_name) <= 20),
    device_id TEXT NOT NULL,
    level_json JSONB NOT NULL,
    level_hash TEXT NOT NULL,
    grid_cols SMALLINT NOT NULL,
    grid_rows SMALLINT NOT NULL,
    piece_count SMALLINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'public' CHECK (status IN ('draft', 'public', 'hidden', 'rejected')),
    likes_count INT NOT NULL DEFAULT 0,
    report_count INT NOT NULL DEFAULT 0,
    hot_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maps_status_created ON maps (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maps_status_hot ON maps (status, hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_maps_level_hash ON maps (level_hash);
CREATE INDEX IF NOT EXISTS idx_maps_device_id ON maps (device_id);

CREATE TABLE IF NOT EXISTS map_votes (
    id BIGSERIAL PRIMARY KEY,
    map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(map_id, device_id)
);

CREATE TABLE IF NOT EXISTS map_reports (
    id BIGSERIAL PRIMARY KEY,
    map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'impossible', 'other')),
    detail TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(map_id, device_id)
);

CREATE TABLE IF NOT EXISTS map_runs (
    id BIGSERIAL PRIMARY KEY,
    map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    moves INT,
    time_seconds INT,
    won BOOLEAN NOT NULL DEFAULT false
);

CREATE OR REPLACE VIEW map_stats AS
SELECT
    map_id,
    COUNT(*) AS total_starts,
    COUNT(*) FILTER (WHERE won = true) AS total_wins,
    ROUND(AVG(moves) FILTER (WHERE won = true))::INT AS avg_moves,
    ROUND(AVG(time_seconds) FILTER (WHERE won = true))::INT AS avg_time,
    CASE
        WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE won = true) / COUNT(*))::INT
        ELSE 0
    END AS win_rate
FROM map_runs
GROUP BY map_id;
