-- Bug 7: Add soft-delete column to employees (batch 2 fixes)
-- Run this against existing deployments: docker exec cafeos_postgres psql -U postgres cafeos -f /docker-entrypoint-initdb.d/002_add_deleted_at.sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
