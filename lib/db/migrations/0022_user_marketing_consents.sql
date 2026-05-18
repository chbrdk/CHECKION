-- Marketing opt-in audit log (e.g. AMC demo registration). Applied via drizzle-kit push on main CHECKION.
CREATE TABLE IF NOT EXISTS user_marketing_consents (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  email text NOT NULL,
  name text,
  company text,
  marketing_opt_in_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'amc'
);

CREATE INDEX IF NOT EXISTS user_marketing_consents_email_idx ON user_marketing_consents (email);
CREATE INDEX IF NOT EXISTS user_marketing_consents_user_id_idx ON user_marketing_consents (user_id);
