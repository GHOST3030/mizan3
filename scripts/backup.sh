#!/bin/bash
# Mizan POS - Database Backup Script
# Usage: ./scripts/backup.sh [output_dir]
# Requires: pg_dump, DATABASE_URL in .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Load env
if [ -f backend/.env ]; then
  export $(grep -v '^\s*#' backend/.env | grep -v '^\s*$' | xargs)
fi

OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="mizan_backup_${TIMESTAMP}.sql"
FILEPATH="${OUTPUT_DIR}/${FILENAME}"

echo "🔹 Starting database backup..."
echo "   Output: $FILEPATH"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL not set in backend/.env"
  exit 1
fi

pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="$FILEPATH"

echo "✅ Backup complete: $FILEPATH"
echo "   Size: $(du -h "$FILEPATH" | cut -f1)"

# Keep only last 30 backups
find "$OUTPUT_DIR" -name "mizan_backup_*.sql" -mtime +30 -delete
echo "   🧹 Old backups cleaned (30-day retention)"
