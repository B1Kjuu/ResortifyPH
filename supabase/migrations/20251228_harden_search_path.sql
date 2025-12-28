-- Harden function search_path to remove role-mutable warnings
-- This migration sets search_path=public for known functions flagged by Supabase Security Advisor.
-- Safe: dynamically alters signatures found; skips if function is missing.

DO $$
DECLARE
  fnames text[] := ARRAY[
    'notify_chat_message',
    'touch_reviews_updated_at',
    'cleanup_old_typing_status',
    'get_user_chats',
    'notify_admins_on_report',
    'create_booking_safe',
    'create_review_safe',
    'get_resort_bookings_admin',
    'touch_reports_updated_at',
    'create_notification'
  ];
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, n.nspname, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(fnames)
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Move btree_gist extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    EXECUTE 'ALTER EXTENSION btree_gist SET SCHEMA extensions';
  END IF;
END $$;

-- Optional verification queries (uncomment to run manually)
-- SELECT proname, oidvectortypes(proargtypes) AS args, proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname = ANY(ARRAY['notify_chat_message','touch_reviews_updated_at','cleanup_old_typing_status','get_user_chats','notify_admins_on_report','create_booking_safe','create_review_safe','get_resort_bookings_admin','touch_reports_updated_at','create_notification']);
-- SELECT extname, nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE extname='btree_gist';
