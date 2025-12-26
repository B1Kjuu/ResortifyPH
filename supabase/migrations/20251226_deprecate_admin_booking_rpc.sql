-- Deprecate admin-wide bookings RPC to align with moderation-first admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'get_all_bookings'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP FUNCTION public.get_all_bookings();
  END IF;
END$$;