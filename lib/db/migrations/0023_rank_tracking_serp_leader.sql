-- Rank tracking: store who holds organic position 1 per SERP snapshot
ALTER TABLE "rank_tracking_positions" ADD COLUMN IF NOT EXISTS "serp_leader_domain" text;
--> statement-breakpoint
ALTER TABLE "rank_tracking_positions" ADD COLUMN IF NOT EXISTS "serp_leader_url" text;
