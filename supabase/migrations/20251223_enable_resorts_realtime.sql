-- Enable realtime for resorts updates so owner approvals reflect changes instantly
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'resorts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resorts;
  END IF;
END $$;

COMMIT;
