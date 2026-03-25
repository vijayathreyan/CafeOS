#!/bin/bash
# Run this once on the server to install all cron jobs
# chmod +x setup_crons.sh && sudo ./setup_crons.sh

SCRIPTS_DIR="/home/ubuntu/cafeos/scripts"
chmod +x "$SCRIPTS_DIR"/*.sh

# Create log dir
mkdir -p /home/ubuntu/backups/logs

# Install crontab for ubuntu user
crontab -l 2>/dev/null > /tmp/existing_cron || true

cat >> /tmp/existing_cron << 'EOF'
# CafeOS — Daily pg_dump at 2am
0 2 * * * /home/ubuntu/cafeos/scripts/backup_daily.sh >> /home/ubuntu/backups/logs/daily.log 2>&1

# CafeOS — Weekly volume backup Sunday 3am
0 3 * * 0 /home/ubuntu/cafeos/scripts/backup_weekly.sh >> /home/ubuntu/backups/logs/weekly.log 2>&1

# CafeOS — Daily disk check 6am
0 6 * * * /home/ubuntu/cafeos/scripts/disk_check.sh >> /home/ubuntu/backups/logs/disk.log 2>&1

# CafeOS — Daily temp/session cleanup 3am
0 3 * * * /home/ubuntu/cafeos/scripts/cleanup_daily.sh >> /home/ubuntu/backups/logs/cleanup.log 2>&1

# CafeOS — Monthly alert/task log cleanup + reindex, 1st of month 1am
0 1 1 * * /home/ubuntu/cafeos/scripts/monthly_maintenance.sh >> /home/ubuntu/backups/logs/monthly.log 2>&1

# CafeOS — Weekly VACUUM ANALYZE Sunday 4am (after volume backup)
0 4 * * 0 docker exec cafeos_postgres psql -U postgres cafeos -c "VACUUM ANALYZE;" >> /home/ubuntu/backups/logs/vacuum.log 2>&1
EOF

crontab /tmp/existing_cron
echo "Cron jobs installed successfully."
crontab -l
