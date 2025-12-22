-- Migration: Consolidate duplicate permissive policies and finalize RLS optimizations
-- Addresses remaining linter items:
-- - 0003_auth_rls_initplan: ensure (SELECT auth.uid()) in all policies
-- - 0006_multiple_permissive_policies: drop duplicates; consolidate where appropriate

begin;

-- PROFILES ---------------------------------------------------------------------------------
-- Drop duplicate/legacy insert and public read policies if present
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Allow signup to create profile" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Create a single insert policy covering anon and authenticated
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own"
      ON public.profiles FOR INSERT TO anon, authenticated
      WITH CHECK (id = (SELECT auth.uid()));
  END IF;
END $$;

-- Recreate select/update to ensure (SELECT auth.uid()) usage and avoid duplicates
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));
END $$;

DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));
END $$;

-- RESORTS ----------------------------------------------------------------------------------
-- Drop legacy duplicate insert/update policies by name if present
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Owners can create resorts" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Owners can update their resorts" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Admins can update resort status" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Ensure single owner insert/update policies remain and use (SELECT auth.uid())
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "resorts_write_owner" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "resorts_write_owner"
    ON public.resorts FOR INSERT TO authenticated
    WITH CHECK (owner_id = (SELECT auth.uid()));
END $$;

DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "resorts_update_owner" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "resorts_update_owner"
    ON public.resorts FOR UPDATE TO authenticated
    USING (owner_id = (SELECT auth.uid()))
    WITH CHECK (owner_id = (SELECT auth.uid()));
END $$;

-- BOOKINGS ---------------------------------------------------------------------------------
-- Drop legacy duplicate insert/update policies by name if present
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Guests can create bookings" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Owners can update their bookings" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Ensure single insert/update/select policies exist and use (SELECT auth.uid())
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "bookings_insert_guest" ON public.bookings;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "bookings_insert_guest"
    ON public.bookings FOR INSERT TO authenticated
    WITH CHECK (guest_id = (SELECT auth.uid()));
END $$;

DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "bookings_update_permitted" ON public.bookings;
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
END $$;

DO $$ BEGIN
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
END $$;

-- CHATS ------------------------------------------------------------------------------------
-- Consolidate multiple SELECT policies into a single policy with OR conditions
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can view chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "creator can view chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "booking stakeholders can view chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "resort owner can view resort chat" ON public.chats;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

DO $$ BEGIN
  CREATE POLICY "chats_select_authenticated"
    ON public.chats FOR SELECT TO authenticated
    USING (
      -- participant
      EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = public.chats.id AND cp.user_id = (SELECT auth.uid())
      )
      OR -- creator
      (public.chats.creator_id = (SELECT auth.uid()))
      OR -- booking stakeholder (guest or resort owner)
      EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.resorts r ON r.id = b.resort_id
        WHERE b.id = public.chats.booking_id
          AND (b.guest_id = (SELECT auth.uid()) OR r.owner_id = (SELECT auth.uid()))
      )
      OR -- resort owner on resort-based chat
      EXISTS (
        SELECT 1 FROM public.resorts r
        WHERE r.id = public.chats.resort_id AND r.owner_id = (SELECT auth.uid())
      )
    );
END $$;

-- Chat messages and participants (ensure (SELECT auth.uid()) is used and no dupes)
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can view messages" ON public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "participants can view messages"
    ON public.chat_messages FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chat_messages.chat_id AND cp.user_id = (SELECT auth.uid())
    ));
END $$;

DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "participants can send messages" ON public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "participants can send messages"
    ON public.chat_messages FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = public.chat_messages.chat_id AND cp.user_id = (SELECT auth.uid())
    ));
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "self view membership" ON public.chat_participants;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "self view membership"
    ON public.chat_participants FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
END $$;

DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "self can join chat" ON public.chat_participants;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  CREATE POLICY "self can join chat"
    ON public.chat_participants FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
END $$;

commit;
