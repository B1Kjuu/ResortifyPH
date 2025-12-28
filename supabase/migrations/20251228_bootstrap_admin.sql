-- Bootstrap admin profile safely by email
-- Edit the EMAIL below to match your admin account, then run this migration in Supabase SQL editor or via CLI.

DO $$
DECLARE
  admin_email text := 'team@resortifyph.me'; -- CHANGE THIS to your admin email
  u RECORD;
BEGIN
  -- Find the auth user by email
  SELECT * INTO u FROM auth.users WHERE email = admin_email LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'No auth.user found for %', admin_email;
    RETURN;
  END IF;

  -- Ensure a profiles row exists for this user
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    u.id,
    u.email,
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'role', ''), 'guest'),
    COALESCE(u.created_at, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
      role = COALESCE(NULLIF(EXCLUDED.role, ''), public.profiles.role);

  -- Promote to admin
  UPDATE public.profiles SET is_admin = true WHERE id = u.id;

  RAISE NOTICE 'Admin bootstrap complete for % (id=%)', admin_email, u.id;
END $$;

-- Optionally verify
-- SELECT id, email, is_admin FROM public.profiles WHERE email = 'team@resortifyph.me';
