-- Safely drop unused indexes only if they have never been scanned
-- Excludes FK-covering indexes (e.g., idx_notifications_actor_id) that are needed for referential performance
DO $$
DECLARE idx text;
DECLARE parts text[];
DECLARE schema_name text;
DECLARE table_name text;
DECLARE index_name text;
DECLARE exists_idx boolean;
DECLARE scans bigint := 0;
BEGIN
  FOREACH idx IN ARRAY ARRAY[
    'public.chat_participants.idx_cp_user',
    'public.chats.idx_chats_creator',
    'public.resorts.idx_resorts_owner',
    'public.notifications.idx_notifications_created',
    'public.message_reactions.idx_reactions_user',
    'public.reports.idx_reports_chat_id',
    'public.reports.idx_reports_reporter_id',
    'public.bookings.idx_bookings_resort_region_code',
    'public.resorts.idx_resorts_region_code',
    'public.moderation_actions.idx_moderation_actions_report_id',
    'public.resorts.idx_resorts_coordinates',
    'public.bookings.idx_bookings_payment_verified_at',
    'public.bookings.idx_bookings_cancellation_status',
    'public.bookings.idx_bookings_verified_by',
    'public.chats.idx_chats_resort',
    'public.chats.idx_chats_booking',
    'public.chat_messages.idx_messages_sender'
    -- Intentionally exclude: 'public.notifications.idx_notifications_actor_id' (FK covering index)
  ] LOOP
    parts := regexp_split_to_array(idx, '\.');
    schema_name := parts[1];
    table_name  := parts[2];
    index_name  := parts[3];

    -- Check existence
    SELECT EXISTS(
      SELECT 1 FROM pg_indexes
      WHERE schemaname = schema_name AND tablename = table_name AND indexname = index_name
    ) INTO exists_idx;

    IF NOT exists_idx THEN
      RAISE NOTICE 'Index % does not exist, skipping', idx;
      CONTINUE;
    END IF;

    -- Check usage stats; if stat not found, treat as 0 scans
    BEGIN
      SELECT s.idx_scan INTO scans
      FROM pg_stat_user_indexes s
      WHERE s.indexrelid = format('%I.%I', schema_name, index_name)::regclass;
    EXCEPTION WHEN others THEN
      scans := 0;
    END;

    IF scans IS NULL THEN
      scans := 0;
    END IF;

    IF scans = 0 THEN
      RAISE NOTICE 'Dropping unused index: %', idx;
      EXECUTE format('DROP INDEX IF EXISTS %I.%I', schema_name, index_name);
    ELSE
      RAISE NOTICE 'Index % has scans=%; keeping', idx, scans;
    END IF;
  END LOOP;
END $$;
