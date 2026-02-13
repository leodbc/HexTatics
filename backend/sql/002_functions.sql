-- 002_functions.sql

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
