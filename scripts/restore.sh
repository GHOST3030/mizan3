#!/bin/bash
# Mizan POS - Database Restore Script
# Usage: ./scripts/restore.sh <backup_file>
# Requires: pg_restore, DATABASE_URL in .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if [ $# -lt 1 ]; then
  echo "❌ Usage: ./scripts/restore.sh <backup_file>"
  echo "   Example: ./scripts/restore.sh ./backups/mizan_backup_20260601_120000.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load env
if [ -f backend/.env ]; then
  export $(grep -v '^\s*#' backend/.env | grep -v '^\s*$' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL not set in backend/.env"
  exit 1
fi

echo "⚠️  WARNING: This will OVERWRITE the current database!"
read -p "   Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 1
fi

echo "🔹 Starting database restore from: $BACKUP_FILE"

pg_restore --clean --if-exists --no-owner --no-acl \
  -d "$DATABASE_URL" "$BACKUP_FILE"

echo "✅ Database restore complete!"
