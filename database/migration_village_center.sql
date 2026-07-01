-- =============================================================
-- PantauJakarta — Add permanent center coordinates to villages
-- =============================================================
-- Kelurahan boundaries essentially never change, so instead of
-- re-querying Overpass for the relation center on every cache miss,
-- we store it once and reuse it forever.

ALTER TABLE villages ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION;
ALTER TABLE villages ADD COLUMN IF NOT EXISTS center_lon DOUBLE PRECISION;
