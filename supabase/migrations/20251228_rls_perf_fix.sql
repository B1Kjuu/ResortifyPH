-- Fix RLS initplan performance warnings by wrapping auth calls with SELECT
-- and align policy conditions with ownership/admin checks.

-- Favorites: own rows
ALTER POLICY favorites_select_own ON public.favorites
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY favorites_insert_own ON public.favorites
  WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY favorites_delete_own ON public.favorites
  USING (user_id = (SELECT auth.uid()));

-- Notifications: own rows and admin read
ALTER POLICY notifications_select_own ON public.notifications
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY notifications_update_own ON public.notifications
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY notifications_delete_own ON public.notifications
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY notifications_insert_self ON public.notifications
  WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY notifications_owner_read ON public.notifications
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY notifications_admin_read ON public.notifications
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_admin));

-- Chat messages: allow sender to update own
ALTER POLICY chat_messages_self_update ON public.chat_messages
  USING (sender_id = (SELECT auth.uid()));

-- Chat message audit: admin read
ALTER POLICY chat_message_audit_admin_select ON public.chat_message_audit
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_admin));

-- Chat participants: user updates own
ALTER POLICY chat_parts_self_update ON public.chat_participants
  USING (user_id = (SELECT auth.uid()));

-- Chat typing: participants can view; users update own
ALTER POLICY "participants can view typing" ON public.chat_typing
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_typing.chat_id AND cp.user_id = (SELECT auth.uid())
  ));
ALTER POLICY "users can update own typing" ON public.chat_typing
  USING (user_id = (SELECT auth.uid()));

-- Reviews: author permissions (reviews use guest_id as author)
ALTER POLICY reviews_insert_guest ON public.reviews
  WITH CHECK (guest_id = (SELECT auth.uid()));
ALTER POLICY reviews_update_author ON public.reviews
  USING (guest_id = (SELECT auth.uid()));
ALTER POLICY reviews_delete_author ON public.reviews
  USING (guest_id = (SELECT auth.uid()));

-- Reports: reporter/admin policies
ALTER POLICY reports_insert_self ON public.reports
  WITH CHECK (reporter_id = (SELECT auth.uid()));
ALTER POLICY reports_select_self ON public.reports
  USING (reporter_id = (SELECT auth.uid()));
ALTER POLICY reports_select_admin ON public.reports
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_admin));
ALTER POLICY reports_update_admin ON public.reports
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_admin));

-- Bookings: guest/owner access and deletes
ALTER POLICY bookings_select_guest_or_owner ON public.bookings
  USING (
    bookings.guest_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.resorts r
      WHERE r.id = bookings.resort_id AND r.owner_id = (SELECT auth.uid())
    )
  );
ALTER POLICY bookings_delete_owner ON public.bookings
  USING (EXISTS (
    SELECT 1 FROM public.resorts r
    WHERE r.id = bookings.resort_id AND r.owner_id = (SELECT auth.uid())
  ));
ALTER POLICY bookings_delete_guest ON public.bookings
  USING (guest_id = (SELECT auth.uid()));
ALTER POLICY "guest can delete past or rejected" ON public.bookings
  USING (
    guest_id = (SELECT auth.uid()) AND
    (status = 'rejected' OR date_to < now()::date)
  );

-- User presence: self update/view (if applicable)
-- (Keep semantics; primary change is wrapping auth.uid() in SELECT.)
ALTER POLICY "users can update own presence" ON public.user_presence
  USING (user_id = (SELECT auth.uid()));

-- Duplicate index cleanup: keep one index on chats(booking_id), drop redundant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_chats_booking_not_null'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.uq_chats_booking_not_null';
  END IF;
END $$;
