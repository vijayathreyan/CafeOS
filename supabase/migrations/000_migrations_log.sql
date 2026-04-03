CREATE TABLE IF NOT EXISTS public.migrations_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by VARCHAR(100) DEFAULT 'system',
  notes TEXT
);

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES ('001_complete_schema', 'Phase 1', 'Complete schema for all 16 phases')
ON CONFLICT (migration_name) DO NOTHING;
