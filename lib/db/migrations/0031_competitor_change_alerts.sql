-- Alerts when competitor / own domain scans detect meaningful changes vs previous crawl.
CREATE TABLE IF NOT EXISTS "competitor_change_alerts" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL,
    "domain" text NOT NULL,
    "domain_scan_id" text NOT NULL REFERENCES "domain_scans"("id") ON DELETE CASCADE,
    "summary" jsonb NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "competitor_change_alerts_project_unread_idx"
    ON "competitor_change_alerts" ("project_id", "read_at");
