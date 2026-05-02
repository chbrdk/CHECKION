-- Normalized WCAG issues per single-scan row (mirrors `scans.result->issues` for SQL queries / reporting).

CREATE TABLE IF NOT EXISTS "scan_issues" (
  "id" text PRIMARY KEY,
  "scan_id" text NOT NULL REFERENCES "scans"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "ordinal" integer NOT NULL,
  "code" text NOT NULL,
  "type" text NOT NULL,
  "message" text NOT NULL,
  "context" text NOT NULL DEFAULT '',
  "selector" text NOT NULL DEFAULT '',
  "runner" text NOT NULL,
  "wcag_level" text NOT NULL,
  "help_url" text,
  "bounding_box" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "scan_issues_scan_ordinal_uniq" UNIQUE ("scan_id", "ordinal")
);

CREATE INDEX IF NOT EXISTS "scan_issues_scan_id_idx" ON "scan_issues" ("scan_id");
CREATE INDEX IF NOT EXISTS "scan_issues_user_id_idx" ON "scan_issues" ("user_id");
CREATE INDEX IF NOT EXISTS "scan_issues_scan_code_idx" ON "scan_issues" ("scan_id", "code");
CREATE INDEX IF NOT EXISTS "scan_issues_scan_type_idx" ON "scan_issues" ("scan_id", "type");
