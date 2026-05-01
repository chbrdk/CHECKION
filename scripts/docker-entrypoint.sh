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

# Optional: assign lineage_key + lineage_version for existing domain_scans (idempotent).
# Set CHECKION_BACKFILL_DOMAIN_SCAN_LINEAGE_ON_START=1 once after deploy when lineage columns are new.
# See knowledge/checkion-domain-scan-lineage.md
if [ -n "$DATABASE_URL" ] && [ -n "$CHECKION_BACKFILL_DOMAIN_SCAN_LINEAGE_ON_START" ]; then
  case "$CHECKION_BACKFILL_DOMAIN_SCAN_LINEAGE_ON_START" in
    0|false|no|off|"")
      ;;
    1|true|yes|run)
      echo "[CHECKION] Running backfill-domain-scan-lineage..."
      if ! npx tsx scripts/backfill-domain-scan-lineage.ts; then
        echo "[CHECKION] backfill-domain-scan-lineage failed — starting app anyway."
      fi
      ;;
    *)
      echo "[CHECKION] Unknown CHECKION_BACKFILL_DOMAIN_SCAN_LINEAGE_ON_START=$CHECKION_BACKFILL_DOMAIN_SCAN_LINEAGE_ON_START (expected 1, true, or 0)"
      ;;
  esac
fi

# Optional: copy projects.tags -> domain_scans.tags (same as admin POST sync-project-tags).
# Set CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START=1 once after deploy / classification changes.
# Optional: CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE=fillEmpty|replaceFromProject (default replaceFromProject).
# See knowledge/checkion-docker-sync-domain-scan-tags.md
if [ -n "$DATABASE_URL" ] && [ -n "$CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START" ]; then
  case "$CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START" in
    0|false|no|off|"")
      ;;
    1|true|yes|run)
      echo "[CHECKION] Running sync-domain-scan-tags-from-projects..."
      if ! npx tsx scripts/sync-domain-scan-tags-from-projects.ts; then
        echo "[CHECKION] sync-domain-scan-tags-from-projects failed — starting app anyway."
      fi
      ;;
    *)
      echo "[CHECKION] Unknown CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START=$CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START (expected 1, true, or 0)"
      ;;
  esac
fi

# Optional: rebuild domain_scans.payload + aggregates from stored page scans (no crawl, no LLM).
# Set CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START=1 or dry-run once after deploy / migration.
# See knowledge/checkion-docker-refresh-domain-payloads.md
if [ -n "$DATABASE_URL" ] && [ -n "$CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START" ]; then
  case "$CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START" in
    0|false|no|off|"")
      ;;
    1|true|yes|run)
      REFRESH_ARGS=""
      if [ -n "$CHECKION_REFRESH_DOMAIN_PAYLOADS_LIMIT" ]; then
        REFRESH_ARGS="$REFRESH_ARGS --limit=$CHECKION_REFRESH_DOMAIN_PAYLOADS_LIMIT"
      fi
      if [ "$CHECKION_REFRESH_DOMAIN_PAYLOADS_ALL_STATUS" = "1" ] || [ "$CHECKION_REFRESH_DOMAIN_PAYLOADS_ALL_STATUS" = "true" ]; then
        REFRESH_ARGS="$REFRESH_ARGS --all-status"
      fi
      echo "[CHECKION] Running refresh-domain-payloads (live)...$REFRESH_ARGS"
      if ! npx tsx scripts/refresh-domain-payloads.ts $REFRESH_ARGS; then
        echo "[CHECKION] refresh-domain-payloads failed — starting app anyway."
      fi
      ;;
    dry-run)
      REFRESH_ARGS=""
      if [ -n "$CHECKION_REFRESH_DOMAIN_PAYLOADS_LIMIT" ]; then
        REFRESH_ARGS="$REFRESH_ARGS --limit=$CHECKION_REFRESH_DOMAIN_PAYLOADS_LIMIT"
      fi
      if [ "$CHECKION_REFRESH_DOMAIN_PAYLOADS_ALL_STATUS" = "1" ] || [ "$CHECKION_REFRESH_DOMAIN_PAYLOADS_ALL_STATUS" = "true" ]; then
        REFRESH_ARGS="$REFRESH_ARGS --all-status"
      fi
      echo "[CHECKION] Running refresh-domain-payloads (--dry-run)...$REFRESH_ARGS"
      npx tsx scripts/refresh-domain-payloads.ts --dry-run $REFRESH_ARGS || true
      ;;
    *)
      echo "[CHECKION] Unknown CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START=$CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START (expected 1, true, dry-run, or 0)"
      ;;
  esac
fi

exec npm run start
