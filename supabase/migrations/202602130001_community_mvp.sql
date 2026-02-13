CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 10)
RETURNS text AS $$
DECLARE
    alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result text := '';
    i int;
BEGIN
    FOR i IN 1..size LOOP
        result := result || substr(alphabet, (floor(random() * length(alphabet))::int + 1), 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION slugify(input text)
RETURNS text AS $$
DECLARE
    s text;
BEGIN
    s := lower(trim(input));
    s := regexp_replace(s, '[^a-z0-9\s-]', '', 'g');
    s := regexp_replace(s, '\s+', '-', 'g');
    s := regexp_replace(s, '-+', '-', 'g');
    s := trim(both '-' from s);
    IF s = '' THEN
        s := 'mapa';
    END IF;
    RETURN s;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION maps_before_insert_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        NEW.id := nanoid(10);
    END IF;

    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := slugify(NEW.title) || '-' || lower(substr(nanoid(4), 1, 4));
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maps_before_insert_defaults ON maps;
CREATE TRIGGER trg_maps_before_insert_defaults
BEFORE INSERT ON maps
FOR EACH ROW
EXECUTE FUNCTION maps_before_insert_defaults();

CREATE OR REPLACE FUNCTION maps_before_update_touch()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maps_before_update_touch ON maps;
CREATE TRIGGER trg_maps_before_update_touch
BEFORE UPDATE ON maps
FOR EACH ROW
EXECUTE FUNCTION maps_before_update_touch();

CREATE OR REPLACE FUNCTION recalc_hot_score(target_map_id text)
RETURNS void AS $$
BEGIN
    UPDATE maps m
    SET hot_score = (
        (m.likes_count * 2
        + COALESCE(s.total_starts, 0)
        + COALESCE(s.total_wins, 0) * 3)
        / POWER((EXTRACT(EPOCH FROM (now() - m.created_at)) / 3600.0 + 24), 1.2)
    )
    FROM map_stats s
    WHERE m.id = target_map_id
      AND s.map_id = target_map_id;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maps_public_read ON maps;
CREATE POLICY maps_public_read ON maps
FOR SELECT
USING (status = 'public');

DROP POLICY IF EXISTS maps_no_direct_insert ON maps;
CREATE POLICY maps_no_direct_insert ON maps
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS maps_no_direct_update ON maps;
CREATE POLICY maps_no_direct_update ON maps
FOR UPDATE
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS maps_no_direct_delete ON maps;
CREATE POLICY maps_no_direct_delete ON maps
FOR DELETE
USING (false);

DROP POLICY IF EXISTS map_votes_no_direct_access ON map_votes;
CREATE POLICY map_votes_no_direct_access ON map_votes
FOR ALL
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS map_reports_no_direct_access ON map_reports;
CREATE POLICY map_reports_no_direct_access ON map_reports
FOR ALL
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS map_runs_no_direct_access ON map_runs;
CREATE POLICY map_runs_no_direct_access ON map_runs
FOR ALL
USING (false)
WITH CHECK (false);

CREATE OR REPLACE FUNCTION check_report_threshold()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE maps
    SET report_count = report_count + 1,
        status = CASE WHEN report_count + 1 >= 3 THEN 'hidden' ELSE status END
    WHERE id = NEW.map_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_auto_hide ON map_reports;
CREATE TRIGGER trg_report_auto_hide
AFTER INSERT ON map_reports
FOR EACH ROW
EXECUTE FUNCTION check_report_threshold();
