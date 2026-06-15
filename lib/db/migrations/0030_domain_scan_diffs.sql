-- Domain scan diffs: compare current deep scan to previous lineage version.
CREATE TABLE IF NOT EXISTS "domain_scan_diffs" (
    "current_domain_scan_id" text PRIMARY KEY NOT NULL REFERENCES "domain_scans"("id") ON DELETE CASCADE,
    "previous_domain_scan_id" text REFERENCES "domain_scans"("id") ON DELETE SET NULL,
    "user_id" text NOT NULL,
    "lineage_key" text NOT NULL,
    "computed_at" timestamp with time zone NOT NULL DEFAULT now(),
    "payload" jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "domain_scan_diffs_user_id_idx" ON "domain_scan_diffs" ("user_id");
CREATE INDEX IF NOT EXISTS "domain_scan_diffs_lineage_key_idx" ON "domain_scan_diffs" ("lineage_key");
