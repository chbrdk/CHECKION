-- Project competitors (single source of truth for rank tracking and GEO)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "competitors" jsonb;
--> statement-breakpoint
UPDATE "projects" SET "competitors" = '[]'::jsonb WHERE "competitors" IS NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "competitors" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "competitors" SET NOT NULL;
--> statement-breakpoint
-- Rank tracking: competitor positions per snapshot (domain -> position, same SERP)
ALTER TABLE "rank_tracking_positions" ADD COLUMN IF NOT EXISTS "competitor_positions" jsonb;
