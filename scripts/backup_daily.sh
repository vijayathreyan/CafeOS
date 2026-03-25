#!/bin/bash
# Daily pg_dump — runs at 2am via cron
# crontab entry: 0 2 * * * /home/ubuntu/cafeos/scripts/backup_daily.sh >> /home/ubuntu/backups/logs/daily.log 2>&1

set -euo pipefail

BACKUP_DIR="/home/ubuntu/backups/daily"
CONTAINER="cafeos_postgres"
DB_NAME="${POSTGRES_DB:-cafeos}"
DB_USER="${POSTGRES_USER:-postgres}"
DATE=$(date +%Y%m%d)
FILE="$BACKUP_DIR/ufw_db_$DATE.sql.gz"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting daily pg_dump backup..."

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

SIZE=$(du -sh "$FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete: $FILE ($SIZE)"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "ufw_db_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned up backups older than $KEEP_DAYS days"

# Log to database
docker exec "$CONTAINER" psql -U "$DB_USER" "$DB_NAME" -c \
  "INSERT INTO backup_log (backup_type, status, size_mb, completed_at) VALUES ('daily_pgdump', 'success', $(du -m "$FILE" | cut -f1), NOW());" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
