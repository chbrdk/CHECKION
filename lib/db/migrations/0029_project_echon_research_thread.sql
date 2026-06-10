-- Pinned ECHON research thread for market context in comprehensive reports (ECHON has no project entity).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS echon_research_thread_id text;
