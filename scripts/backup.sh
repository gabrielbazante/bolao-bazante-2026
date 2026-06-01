#!/usr/bin/env bash
# Weekly pg_dump backup of production. Run with SUPABASE_DB_URL set:
#   SUPABASE_DB_URL=postgresql://... bash scripts/backup.sh
set -euo pipefail
: "${SUPABASE_DB_URL:?need SUPABASE_DB_URL}"
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
pg_dump --no-owner --no-privileges "$SUPABASE_DB_URL" \
  > "backups/bolao-${ts}.sql"
echo "Wrote backups/bolao-${ts}.sql"
