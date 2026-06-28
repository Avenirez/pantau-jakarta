-- =============================================================
-- PantauJakarta — Supabase/PostgreSQL Migration
-- Jakarta Digital Budget Transparency Platform
-- =============================================================

-- 1. Districts (Kecamatan)
CREATE TABLE IF NOT EXISTS districts (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Villages (Kelurahan)
CREATE TABLE IF NOT EXISTS villages (
    id          SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(district_id, name)
);

-- 3. Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id                  SERIAL PRIMARY KEY,
    village_id          INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
    sector              VARCHAR(50) NOT NULL CHECK (sector IN ('flood', 'infrastructure', 'health')),
    program_name        TEXT NOT NULL,
    allocation_amount   BIGINT NOT NULL,
    fiscal_year         INTEGER NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. AI Summaries (one per village, upsertable)
CREATE TABLE IF NOT EXISTS ai_summaries (
    id              SERIAL PRIMARY KEY,
    village_id      INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE UNIQUE,
    summarized_text TEXT NOT NULL,
    generated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_villages_district    ON villages(district_id);
CREATE INDEX IF NOT EXISTS idx_budgets_village      ON budgets(village_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year  ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_sector       ON budgets(sector);

-- 6. Enable Row Level Security (public read-only)
ALTER TABLE districts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read districts"    ON districts    FOR SELECT USING (true);
CREATE POLICY "Public read villages"     ON villages     FOR SELECT USING (true);
CREATE POLICY "Public read budgets"      ON budgets      FOR SELECT USING (true);
CREATE POLICY "Public read ai_summaries" ON ai_summaries FOR SELECT USING (true);
