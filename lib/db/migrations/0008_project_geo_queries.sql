-- Project GEO queries (stored queries for GEO/E-E-A-T runs)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "geo_queries" jsonb;
--> statement-breakpoint
UPDATE "projects" SET "geo_queries" = '[]'::jsonb WHERE "geo_queries" IS NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "geo_queries" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "geo_queries" SET NOT NULL;
