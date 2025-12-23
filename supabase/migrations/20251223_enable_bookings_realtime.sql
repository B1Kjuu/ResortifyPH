-- Enable realtime for bookings updates so owner view reflects changes instantly
BEGIN;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;