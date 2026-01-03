-- Fix foreign key constraints to allow user deletion
-- This adds ON DELETE CASCADE to all tables referencing auth.users

-- 1. profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. notifications table
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_actor_id_fkey 
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. chat_typing table
ALTER TABLE public.chat_typing DROP CONSTRAINT IF EXISTS chat_typing_user_id_fkey;
ALTER TABLE public.chat_typing 
  ADD CONSTRAINT chat_typing_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. message_reactions table
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;
ALTER TABLE public.message_reactions 
  ADD CONSTRAINT message_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. user_presence table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence' AND table_schema = 'public') THEN
    ALTER TABLE public.user_presence DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey;
    ALTER TABLE public.user_presence 
      ADD CONSTRAINT user_presence_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. favorites table (references profiles which cascades from auth.users, but let's ensure it's set)
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.favorites 
  ADD CONSTRAINT favorites_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add comment
COMMENT ON TABLE public.profiles IS 'User profiles with CASCADE delete from auth.users for clean user removal';
