#!/bin/bash
# Monthly maintenance — 1st of every month at 1am
DB_NAME="${POSTGRES_DB:-cafeos}"
DB_USER="${POSTGRES_USER:-postgres}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running monthly maintenance..."

# Delete alert_log entries older than 6 months
docker exec cafeos_postgres psql -U "$DB_USER" "$DB_NAME" -c \
  "DELETE FROM alert_log WHERE created_at < NOW() - INTERVAL '6 months';"

# Delete completed tasks older than 3 months
docker exec cafeos_postgres psql -U "$DB_USER" "$DB_NAME" -c \
  "DELETE FROM tasks WHERE status = 'done' AND updated_at < NOW() - INTERVAL '3 months';"

# REINDEX (after VACUUM at 4am this same night via separate cron)
docker exec cafeos_postgres psql -U "$DB_USER" "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;"

# Log maintenance
docker exec cafeos_postgres psql -U "$DB_USER" "$DB_NAME" -c \
  "INSERT INTO maintenance_log (task_name, trigger_type, outcome, completed_at) VALUES ('monthly_maintenance', 'auto', 'success', NOW());"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Monthly maintenance complete."
