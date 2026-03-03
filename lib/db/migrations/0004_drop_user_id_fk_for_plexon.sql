-- Allow user_id to store PLEXON user IDs without requiring a row in CHECKION's users table.
-- When using central PLEXON auth, users exist only in PLEXON; scans/projects/etc. still need to reference them by ID.
ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "domain_scans" DROP CONSTRAINT IF EXISTS "domain_scans_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "geo_eeat_runs" DROP CONSTRAINT IF EXISTS "geo_eeat_runs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "api_tokens" DROP CONSTRAINT IF EXISTS "api_tokens_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "share_links" DROP CONSTRAINT IF EXISTS "share_links_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "saved_journeys" DROP CONSTRAINT IF EXISTS "saved_journeys_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "journey_runs" DROP CONSTRAINT IF EXISTS "journey_runs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "geo_eeat_competitive_runs" DROP CONSTRAINT IF EXISTS "geo_eeat_competitive_runs_user_id_users_id_fk";
