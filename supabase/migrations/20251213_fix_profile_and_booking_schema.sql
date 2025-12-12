-- Migration: strengthen profile data, allow resort rejection, and track booking guest counts
-- Run in Supabase SQL editor or with the Supabase CLI

begin;

-- 1. Profiles email + admin flags -----------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles AS p
SET email = u.email
FROM auth.users AS u
WHERE u.id = p.id
  AND p.email IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_email_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean;

UPDATE public.profiles
SET is_admin = COALESCE(is_admin, false);

ALTER TABLE public.profiles
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN is_admin SET NOT NULL;

-- Ensure every auth user has a profile row
INSERT INTO public.profiles (id, full_name, role, email, created_at)
SELECT u.id,
       COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
       COALESCE(u.raw_user_meta_data ->> 'role', 'guest'),
       u.email,
       COALESCE(u.created_at, now())
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. Resort moderation supports rejection ---------------------------------------------------
ALTER TABLE public.resorts DROP CONSTRAINT IF EXISTS resorts_status_check;
ALTER TABLE public.resorts
  ADD CONSTRAINT resorts_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Booking guest counts -------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_count integer;

UPDATE public.bookings
SET guest_count = COALESCE(guest_count, 1);

ALTER TABLE public.bookings
  ALTER COLUMN guest_count SET DEFAULT 1,
  ALTER COLUMN guest_count SET NOT NULL;

-- 4. Automatic profile sync with auth.users -------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'guest'),
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
      role = COALESCE(NULLIF(EXCLUDED.role, ''), public.profiles.role);

  return NEW;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  UPDATE public.profiles
  SET email = NEW.email,
      full_name = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), full_name),
      role = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), role)
  WHERE id = NEW.id;

  return NEW;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_users_created ON auth.users;
CREATE TRIGGER on_auth_users_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_users_updated ON auth.users;
CREATE TRIGGER on_auth_users_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_user();

commit;
