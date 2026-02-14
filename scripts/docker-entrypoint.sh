#!/bin/sh
set -e

# Apply DB schema (create/update tables) before starting the app.
if [ -n "$DATABASE_URL" ]; then
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
