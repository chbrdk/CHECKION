-- Cross-user reuse of standalone WCAG scans: one canonical `scans` row set per session; other users get a link row for project context + list access.
CREATE TABLE IF NOT EXISTS "standalone_scan_entitlements" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "project_id" text REFERENCES "projects"("id") ON DELETE SET NULL,
    "scan_session_id" text NOT NULL REFERENCES "scan_sessions"("id") ON DELETE CASCADE,
    "canonical_desktop_scan_id" text NOT NULL REFERENCES "scans"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "standalone_scan_entitlements_user_session_uniq" UNIQUE ("user_id", "scan_session_id")
);

CREATE INDEX IF NOT EXISTS "standalone_scan_entitlements_user_created_idx"
    ON "standalone_scan_entitlements" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "standalone_scan_entitlements_desktop_idx"
    ON "standalone_scan_entitlements" ("canonical_desktop_scan_id");
