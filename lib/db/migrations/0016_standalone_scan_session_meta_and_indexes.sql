-- Session metadata for single-scan runs + index for paginated standalone lists (desktop row per session).
ALTER TABLE "scan_sessions" ADD COLUMN IF NOT EXISTS "target_region" text;

CREATE INDEX IF NOT EXISTS "scans_standalone_desktop_user_ts_idx"
  ON "scans" ("user_id", "timestamp" DESC)
  WHERE "scan_session_id" IS NOT NULL AND "device" = 'desktop';
