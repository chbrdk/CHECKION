-- Project references to domain scans (competitor deep scans: standalone scans, referenced by project)
CREATE TABLE IF NOT EXISTS "project_domain_scan_references" (
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "domain" text NOT NULL,
  "domain_scan_id" text NOT NULL REFERENCES "domain_scans"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("project_id", "domain")
);
