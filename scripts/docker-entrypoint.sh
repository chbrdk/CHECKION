#!/bin/sh
set -e

# Apply DB schema (create/update tables) before starting the app.
if [ -n "$DATABASE_URL" ]; then
  # One-time: drop user_id FKs so PLEXON user IDs work without a row in CHECKION users table.
  if [ -f "./lib/db/migrations/0004_drop_user_id_fk_for_plexon.sql" ]; then
    echo "[CHECKION] Running migration 0004 (drop user_id FKs for PLEXON)..."
    node ./scripts/run-migration-0004.mjs || true
  fi
  echo "[CHECKION] Running drizzle-kit push..."
  if npx drizzle-kit push; then
    echo "[CHECKION] Schema up to date."
  else
    echo "[CHECKION] drizzle-kit push failed (DB unreachable or schema error). App will start anyway."
  fi
else
  echo "[CHECKION] DATABASE_URL not set, skipping schema push."
fi

exec npm run start
