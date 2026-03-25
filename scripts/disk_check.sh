#!/bin/bash
# Daily disk usage check — alerts owner if >80%
THRESHOLD=80
USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: Disk usage at ${USAGE}% — threshold ${THRESHOLD}%"
  # Alert will be fired by the app's alert engine reading this threshold
  # App checks backup_log and system health on page load
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Disk usage: ${USAGE}%"
