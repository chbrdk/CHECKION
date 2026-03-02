-- Projects table and optional projectId on scans, domain_scans, journey_runs, geo_eeat_runs
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "project_id" text;
--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "domain_scans" ADD COLUMN IF NOT EXISTS "project_id" text;
--> statement-breakpoint
ALTER TABLE "domain_scans" ADD CONSTRAINT "domain_scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "journey_runs" ADD COLUMN IF NOT EXISTS "project_id" text;
--> statement-breakpoint
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_eeat_runs" ADD COLUMN IF NOT EXISTS "project_id" text;
--> statement-breakpoint
ALTER TABLE "geo_eeat_runs" ADD CONSTRAINT "geo_eeat_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
