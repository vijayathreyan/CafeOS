#!/bin/bash
# Weekly Docker volume backup — runs Sunday 3am via cron
# crontab entry: 0 3 * * 0 /home/ubuntu/cafeos/scripts/backup_weekly.sh >> /home/ubuntu/backups/logs/weekly.log 2>&1

set -euo pipefail

BACKUP_DIR="/home/ubuntu/backups/weekly"
COMPOSE_DIR="/home/ubuntu/cafeos"
DB_NAME="${POSTGRES_DB:-cafeos}"
DB_USER="${POSTGRES_USER:-postgres}"
DATE=$(date +%Y%m%d)
DEST="$BACKUP_DIR/cafeos_vol_$DATE"
KEEP_WEEKS=4

mkdir -p "$DEST"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting weekly Docker volume backup..."

# Stop the app gracefully (keep postgres running for consistent snapshot)
cd "$COMPOSE_DIR"
docker compose stop app nginx

# Copy postgres data volume
docker run --rm \
  -v cafeos_postgres_data:/source:ro \
  -v "$DEST":/dest \
  alpine tar czf /dest/postgres_data.tar.gz -C /source .

# Copy storage data volume
docker run --rm \
  -v cafeos_storage_data:/source:ro \
  -v "$DEST":/dest \
  alpine tar czf /dest/storage_data.tar.gz -C /source .

# Also include a pg_dump for portability
docker exec cafeos_postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$DEST/ufw_db_$DATE.sql.gz"

# Restart services
docker compose start app nginx

SIZE=$(du -sh "$DEST" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Weekly backup complete: $DEST ($SIZE)"

# Remove backups older than KEEP_WEEKS weeks
find "$BACKUP_DIR" -maxdepth 1 -type d -name "cafeos_vol_*" -mtime +$((KEEP_WEEKS * 7)) -exec rm -rf {} +
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned up backups older than $KEEP_WEEKS weeks"

# Log to database
docker exec cafeos_postgres psql -U "$DB_USER" "$DB_NAME" -c \
  "INSERT INTO backup_log (backup_type, status, size_mb, completed_at) VALUES ('weekly_volume', 'success', $(du -sm "$DEST" | cut -f1), NOW());" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
