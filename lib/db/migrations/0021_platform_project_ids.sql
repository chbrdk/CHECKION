-- Canonical PLEXON platform project mirror columns
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "platform_project_id" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "platform_company_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "projects_platform_project_id_unique"
  ON "projects" ("platform_project_id")
  WHERE "platform_project_id" IS NOT NULL;
