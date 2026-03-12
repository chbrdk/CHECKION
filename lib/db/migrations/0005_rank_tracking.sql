-- Rank tracking: keywords per project and position history
CREATE TABLE IF NOT EXISTS "rank_tracking_keywords" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"domain" text NOT NULL,
	"keyword" text NOT NULL,
	"country" text,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ADD CONSTRAINT "rank_tracking_keywords_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rank_tracking_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"keyword_id" text NOT NULL,
	"position" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rank_tracking_positions" ADD CONSTRAINT "rank_tracking_positions_keyword_id_rank_tracking_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."rank_tracking_keywords"("id") ON DELETE cascade ON UPDATE no action;
