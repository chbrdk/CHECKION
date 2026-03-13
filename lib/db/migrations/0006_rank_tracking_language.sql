-- Add language (hl) and make country (gl) required for rank tracking (main markets)
ALTER TABLE "rank_tracking_keywords" ADD COLUMN IF NOT EXISTS "language" text;
--> statement-breakpoint
UPDATE "rank_tracking_keywords" SET "language" = COALESCE("country", 'de') WHERE "language" IS NULL;
--> statement-breakpoint
UPDATE "rank_tracking_keywords" SET "country" = COALESCE("country", 'de') WHERE "country" IS NULL;
--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ALTER COLUMN "language" SET DEFAULT 'de';
--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ALTER COLUMN "language" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ALTER COLUMN "country" SET NOT NULL;
