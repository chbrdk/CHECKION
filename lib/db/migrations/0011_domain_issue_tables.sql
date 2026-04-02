-- Domain scan issue storage (raw + aggregated) for fast Deep Scan "Issues (Domain)" UI

CREATE TABLE IF NOT EXISTS "domain_pages" (
  "id" text PRIMARY KEY,
  "domain_scan_id" text NOT NULL REFERENCES "domain_scans"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "url" text NOT NULL,
  "page_scan_id" text REFERENCES "scans"("id") ON DELETE SET NULL,
  "device" text,
  "score" integer,
  "ux_score" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "domain_pages_domain_url_unique" UNIQUE ("domain_scan_id", "url")
);

CREATE INDEX IF NOT EXISTS "domain_pages_domain_scan_id_idx" ON "domain_pages" ("domain_scan_id");

CREATE TABLE IF NOT EXISTS "domain_page_issues" (
  "id" text PRIMARY KEY,
  "domain_scan_id" text NOT NULL REFERENCES "domain_scans"("id") ON DELETE CASCADE,
  "domain_page_id" text NOT NULL REFERENCES "domain_pages"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "group_key" text NOT NULL,
  "type" text NOT NULL,
  "code" text NOT NULL,
  "message" text NOT NULL,
  "runner" text,
  "wcag_level" text,
  "help_url" text,
  "selector" text,
  "meta" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "domain_page_issues_domain_scan_id_idx" ON "domain_page_issues" ("domain_scan_id");
CREATE INDEX IF NOT EXISTS "domain_page_issues_domain_page_id_idx" ON "domain_page_issues" ("domain_page_id");
CREATE INDEX IF NOT EXISTS "domain_page_issues_domain_scan_type_idx" ON "domain_page_issues" ("domain_scan_id", "type");
CREATE INDEX IF NOT EXISTS "domain_page_issues_domain_scan_code_idx" ON "domain_page_issues" ("domain_scan_id", "code");
CREATE INDEX IF NOT EXISTS "domain_page_issues_domain_scan_group_key_idx" ON "domain_page_issues" ("domain_scan_id", "group_key");

CREATE TABLE IF NOT EXISTS "domain_issue_groups" (
  "domain_scan_id" text NOT NULL REFERENCES "domain_scans"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "group_key" text NOT NULL,
  "type" text NOT NULL,
  "code" text NOT NULL,
  "message" text NOT NULL,
  "runner" text,
  "wcag_level" text,
  "help_url" text,
  "page_count" integer NOT NULL DEFAULT 0,
  "first_seen_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("domain_scan_id", "group_key")
);

CREATE INDEX IF NOT EXISTS "domain_issue_groups_domain_scan_page_count_idx"
  ON "domain_issue_groups" ("domain_scan_id", "page_count" DESC);
CREATE INDEX IF NOT EXISTS "domain_issue_groups_domain_scan_type_page_count_idx"
  ON "domain_issue_groups" ("domain_scan_id", "type", "page_count" DESC);
CREATE INDEX IF NOT EXISTS "domain_issue_groups_domain_scan_wcag_level_idx"
  ON "domain_issue_groups" ("domain_scan_id", "wcag_level");

