-- Deep-scan industry independent of project (list + filters use coalesce with projects.industry).
ALTER TABLE "domain_scans" ADD COLUMN IF NOT EXISTS "industry" text;
