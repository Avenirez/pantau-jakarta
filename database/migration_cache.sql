-- =============================================================
-- PantauJakarta — Cache Database Schema for OSM Facilities
-- =============================================================

CREATE TABLE IF NOT EXISTS osm_facilities_cache (
    id           SERIAL PRIMARY KEY,
    village_name VARCHAR(255) NOT NULL UNIQUE,
    facilities   JSONB NOT NULL,
    center       JSONB,
    updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE osm_facilities_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read/write so client-side / serverless functions can read & write
CREATE POLICY "Public read osm_facilities_cache" ON osm_facilities_cache FOR SELECT USING (true);
CREATE POLICY "Public insert osm_facilities_cache" ON osm_facilities_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update osm_facilities_cache" ON osm_facilities_cache FOR UPDATE USING (true) WITH CHECK (true);
