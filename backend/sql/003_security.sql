-- 003_security.sql

-- RLS
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_runs ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas de mapas públicos
DROP POLICY IF EXISTS maps_public_read ON maps;
CREATE POLICY maps_public_read ON maps
FOR SELECT
USING (status = 'public');

-- Escrita ficará restrita por Edge Functions com service role.
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

-- Tabelas auxiliares: leitura opcional bloqueada por padrão
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

-- Auto-hide por denúncias
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
