-- Project value proposition (from research or manual)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "value_proposition" text;
