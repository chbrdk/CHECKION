-- Project executive report runs (async bundle generation)
CREATE TABLE IF NOT EXISTS project_report_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'de',
    variant TEXT NOT NULL DEFAULT 'executive',
    bundle JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS project_report_runs_project_id_idx ON project_report_runs(project_id);
CREATE INDEX IF NOT EXISTS project_report_runs_user_id_idx ON project_report_runs(user_id);
