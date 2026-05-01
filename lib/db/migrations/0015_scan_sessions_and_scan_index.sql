-- Standalone multi-device sessions + relational index columns on scans (JSONB remains source of truth).
CREATE TABLE IF NOT EXISTS "scan_sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "project_id" text REFERENCES "projects"("id") ON DELETE SET NULL,
    "url" text NOT NULL,
    "standard" text,
    "runners" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "scan_session_id" text REFERENCES "scan_sessions"("id") ON DELETE SET NULL;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "result_schema_version" integer;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "errors_count" integer;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "warnings_count" integer;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "notices_count" integer;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "score" integer;

CREATE INDEX IF NOT EXISTS "scan_sessions_user_id_created_at_idx" ON "scan_sessions" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "scans_scan_session_id_idx" ON "scans" ("scan_session_id");
CREATE INDEX IF NOT EXISTS "scans_user_id_device_group_id_idx" ON "scans" ("user_id", "device", "group_id");
