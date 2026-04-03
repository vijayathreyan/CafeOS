# Database Migrations

## Rules — Non-Negotiable
- Files numbered sequentially: 000, 001, 002, 003...
- NEVER modify existing migration files
- Each new migration is additive only — no DROP, no ALTER existing columns
- One migration file per phase minimum

## Migration History
- 000_migrations_log.sql — Migration tracking table
- 001_complete_schema.sql — Phase 1: Complete schema for all 16 phases
- 002_add_deleted_at.sql — Soft-delete: adds deleted_at to employees
- 003_snack_tamil_names.sql — Inserts snack items into item_master with Tamil names; links snack_entries.item_id

## Adding New Migrations
1. Create next numbered file: 004_phase2_additions.sql
2. Add only new tables or new columns — never modify existing
3. Register in migrations_log:
   ```sql
   INSERT INTO migrations_log (migration_name, applied_by, notes)
   VALUES ('004_phase2_additions', 'Phase 2', 'Description of changes');
   ```
4. Apply to running database:
   ```bash
   docker exec cafeos_postgres psql -U postgres -d postgres < supabase/migrations/004_phase2_additions.sql
   ```

## Next Migration
Phase 2 schema changes go in: 004_phase2_additions.sql
