-- Deep-scan lineage: versioned re-runs per user + project + normalized domain (app sets lineage_key on insert).

ALTER TABLE "domain_scans" ADD COLUMN IF NOT EXISTS "lineage_key" text;
ALTER TABLE "domain_scans" ADD COLUMN IF NOT EXISTS "lineage_version" integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "domain_scans_lineage_key_version_uniq"
  ON "domain_scans" ("lineage_key", "lineage_version")
  WHERE "lineage_key" IS NOT NULL;
