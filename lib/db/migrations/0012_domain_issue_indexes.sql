-- P1: Additional indexes for high-volume domain issue tables

CREATE INDEX IF NOT EXISTS "domain_pages_domain_scan_user_idx"
  ON "domain_pages" ("domain_scan_id", "user_id");

CREATE INDEX IF NOT EXISTS "domain_page_issues_domain_scan_user_group_idx"
  ON "domain_page_issues" ("domain_scan_id", "user_id", "group_key");

CREATE INDEX IF NOT EXISTS "domain_issue_groups_domain_scan_user_page_count_idx"
  ON "domain_issue_groups" ("domain_scan_id", "user_id", "page_count" DESC);

CREATE INDEX IF NOT EXISTS "domain_issue_groups_domain_scan_user_type_page_count_idx"
  ON "domain_issue_groups" ("domain_scan_id", "user_id", "type", "page_count" DESC);

