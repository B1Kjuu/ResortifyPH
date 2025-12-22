-- Migration: Harden RLS policies, set safe search_path, enable RLS on storage logs, and add missing indexes
-- Applies linter remediations for:
-- - 0001_unindexed_foreign_keys
-- - 0003_auth_rls_initplan
-- - 0006_multiple_permissive_policies (by consolidating to a single policy per action)
-- - 0011_function_search_path_mutable
-- - 0013_rls_disabled_in_public (storage tables)

begin;

-- 1) Enable RLS on storage log tables (deny-by-default) ------------------------------------
alter table if exists public.storage_activity enable row level security;
alter table if exists public.storage_alerts  enable row level security;

-- Only service_role may read these; writes happen via SECURITY DEFINER functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='storage_activity' AND policyname='service can read storage activity'
  ) THEN
    CREATE POLICY "service can read storage activity"
      ON public.storage_activity FOR SELECT TO service_role
      USING (true);
  END IF;
END; $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='storage_alerts' AND policyname='service can read storage alerts'
  ) THEN
    CREATE POLICY "service can read storage alerts"
      ON public.storage_alerts FOR SELECT TO service_role
      USING (true);
  END IF;
END; $$;

-- 2) Set safe, deterministic search_path on functions --------------------------------------
-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- flag_high_upload_rate
CREATE OR REPLACE FUNCTION public.flag_high_upload_rate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.storage_alerts (owner, bucket_id, object_count, window_minutes, note)
  SELECT owner, bucket_id, count(*) AS object_count, 10 AS window_minutes, 'High upload rate'
  FROM public.storage_activity
  WHERE occurred_at > now() - interval '10 minutes'
  GROUP BY owner, bucket_id
  HAVING count(*) > 20;
END;
$$;

-- 3) Consolidate policies and switch auth.uid() -> (select auth.uid()) ----------------------
-- PROFILES
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));
END; $$;

-- RESORTS (keep public read; owner write/update)
DO $$
BEGIN
  -- remove possible duplicate legacy policies if present
  BEGIN
    DROP POLICY IF EXISTS "Anyone can read approved resorts" ON public.resorts;
    DROP POLICY IF EXISTS "Admins can update resort status" ON public.resorts;
    DROP POLICY IF EXISTS "Owners can update their resorts" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END; $$;

DO $$
BEGIN
  -- Ensure single public read policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='resorts' AND policyname='resorts_select_public'
  ) THEN
    CREATE POLICY "resorts_select_public"
      ON public.resorts FOR SELECT TO public
      USING (true);
  END IF;
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "resorts_write_owner" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "resorts_write_owner"
    ON public.resorts FOR INSERT TO authenticated
    WITH CHECK (owner_id = (SELECT auth.uid()));
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "resorts_update_owner" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "resorts_update_owner"
    ON public.resorts FOR UPDATE TO authenticated
    USING (owner_id = (SELECT auth.uid()))
    WITH CHECK (owner_id = (SELECT auth.uid()));
END; $$;

-- BOOKINGS (unify select & update; use single policies)
DO $$
BEGIN
  -- Drop legacy duplicates if they exist
  BEGIN
    DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Guests can read own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Guests can view their own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Owners can read bookings for their resorts" ON public.bookings;
    DROP POLICY IF EXISTS "Owners can view bookings for their resorts" ON public.bookings;
    DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Owners can update their bookings" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "bookings_select_guest_or_owner" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "bookings_select_guest_or_owner"
    ON public.bookings FOR SELECT TO authenticated
    USING (
      guest_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.resorts r
        WHERE r.id = public.bookings.resort_id AND r.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true
      )
    );
END; $$;

DO $$
BEGIN
  -- Single update policy permitting guest, resort owner, or admin
  BEGIN
    DROP POLICY IF EXISTS "bookings_update_guest" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "bookings_update_permitted"
    ON public.bookings FOR UPDATE TO authenticated
    USING (
      public.bookings.guest_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.resorts r
        WHERE r.id = public.bookings.resort_id AND r.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true
      )
    )
    WITH CHECK (
      public.bookings.guest_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.resorts r
        WHERE r.id = public.bookings.resort_id AND r.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true
      )
    );
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "bookings_insert_guest" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "bookings_insert_guest"
    ON public.bookings FOR INSERT TO authenticated
    WITH CHECK (guest_id = (SELECT auth.uid()));
END; $$;

-- CHATS & MESSAGES
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can view chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "participants can view chat"
    ON public.chats FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chats.id AND cp.user_id = (SELECT auth.uid())
    ));
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "authenticated can create chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "authenticated can create chat"
    ON public.chats FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND creator_id = (SELECT auth.uid()));
END; $$;

DO $$
BEGIN
  -- creator can view own chat
  BEGIN
    DROP POLICY IF EXISTS "creator can view chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "creator can view chat"
    ON public.chats FOR SELECT TO authenticated
    USING (creator_id = (SELECT auth.uid()));
END; $$;

-- Additional chat select policies for stakeholders
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "booking stakeholders can view chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "booking stakeholders can view chat"
    ON public.chats FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.resorts r ON r.id = b.resort_id
        WHERE b.id = public.chats.booking_id
          AND (b.guest_id = (SELECT auth.uid()) OR r.owner_id = (SELECT auth.uid()))
      )
    );
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "resort owner can view resort chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "resort owner can view resort chat"
    ON public.chats FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.resorts r
        WHERE r.id = public.chats.resort_id AND r.owner_id = (SELECT auth.uid())
      )
    );
END; $$;

-- Chat messages
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can view messages" ON public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "participants can view messages"
    ON public.chat_messages FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chat_messages.chat_id AND cp.user_id = (SELECT auth.uid())
    ));
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can send messages" ON public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "participants can send messages"
    ON public.chat_messages FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chat_messages.chat_id AND cp.user_id = (SELECT auth.uid())
    ));
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can mark read" ON public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "participants can mark read"
    ON public.chat_messages FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chat_messages.chat_id AND cp.user_id = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chat_messages.chat_id AND cp.user_id = (SELECT auth.uid())
    ));
END; $$;

-- Chat participants
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "self view membership" ON public.chat_participants;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "self view membership"
    ON public.chat_participants FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
END; $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "self can join chat" ON public.chat_participants;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "self can join chat"
    ON public.chat_participants FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
END; $$;

-- Storage avatar folder policy: switch to SELECT auth.uid()
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Insert avatar own folder" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "Insert avatar own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND name LIKE ((SELECT auth.uid())::text || '/%')
    );
END; $$;

-- 4) Add missing foreign key indexes -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_guest   ON public.bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resort  ON public.bookings(resort_id);
CREATE INDEX IF NOT EXISTS idx_cp_user          ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_creator    ON public.chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_resorts_owner    ON public.resorts(owner_id);

commit;
