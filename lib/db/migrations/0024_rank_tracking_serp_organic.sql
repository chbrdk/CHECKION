-- Store full organic SERP listings per snapshot for Google-style preview UI.
ALTER TABLE rank_tracking_positions ADD COLUMN IF NOT EXISTS serp_organic jsonb;
