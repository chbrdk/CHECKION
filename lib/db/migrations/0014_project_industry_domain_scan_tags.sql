-- Project industry + tags; domain scan tags for filtering (latest lineage list joins projects).
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "industry" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "domain_scans" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
