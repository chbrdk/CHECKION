-- Group rank-tracking keywords across markets (same search intent, localized query text).
ALTER TABLE rank_tracking_keywords ADD COLUMN IF NOT EXISTS intent_key text;
ALTER TABLE rank_tracking_keywords ADD COLUMN IF NOT EXISTS intent_label text;
