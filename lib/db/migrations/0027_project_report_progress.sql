-- Progress tracking for long-running comprehensive project reports
ALTER TABLE project_report_runs ADD COLUMN IF NOT EXISTS progress JSONB;
