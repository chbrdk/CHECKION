-- Last project research agent result (target groups, suggested keywords, etc.)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_snapshot jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_captured_at timestamptz;
