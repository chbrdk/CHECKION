CREATE TABLE IF NOT EXISTS "geo_eeat_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"domain_scan_id" text,
	"status" text NOT NULL,
	"payload" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_eeat_runs" ADD CONSTRAINT "geo_eeat_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "geo_eeat_runs" ADD CONSTRAINT "geo_eeat_runs_domain_scan_id_domain_scans_id_fk" FOREIGN KEY ("domain_scan_id") REFERENCES "public"."domain_scans"("id") ON DELETE set null ON UPDATE no action;
