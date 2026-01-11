-- Track Terms & Conditions acceptance on user profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted_at ON profiles(terms_accepted_at);
