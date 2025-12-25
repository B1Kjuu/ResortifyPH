-- Create favorites table with RLS
BEGIN;

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_resort_unique UNIQUE (user_id, resort_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Only owners of the row can select/insert/delete their favorites
CREATE POLICY favorites_select_own
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY favorites_insert_own
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY favorites_delete_own
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Helpful composite index
CREATE INDEX IF NOT EXISTS favorites_user_resort_idx ON public.favorites (user_id, resort_id);

COMMIT;
