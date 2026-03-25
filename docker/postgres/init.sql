-- ============================================================
-- CafeOS — Postgres init (runs FIRST via 00_ prefix)
-- Creates auth/storage/public schemas before GoTrue and
-- Supabase Storage connect and run their own migrations.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS public;

GRANT ALL ON SCHEMA auth    TO postgres;
GRANT ALL ON SCHEMA storage TO postgres;
GRANT ALL ON SCHEMA public  TO postgres;
