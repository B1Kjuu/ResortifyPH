-- Cautious unused index drop list: raises notices and suggests commands.
-- No indexes are dropped automatically.
DO $$
DECLARE idx text;
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
  ] LOOP
    RAISE NOTICE 'Unused index candidate: %', idx;
    RAISE NOTICE 'Suggested drop: DROP INDEX IF EXISTS %;', idx;
  END LOOP;
END $$;
