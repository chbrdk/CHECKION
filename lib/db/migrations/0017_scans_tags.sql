-- Scan-level tags for standalone WCAG rows (filter parity with domain_scans.tags + projects.tags).
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "scans_tags_gin_idx" ON "scans" USING gin ("tags");
