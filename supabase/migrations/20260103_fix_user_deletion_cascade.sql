-- Fix foreign key constraints to allow user deletion
-- This adds ON DELETE CASCADE to all tables referencing auth.users or profiles

-- ==========================================
-- STEP 1: Tables referencing auth.users(id) directly
-- ==========================================

-- 1.1 profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.2 notifications table
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_actor_id_fkey 
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 1.3 chat_typing table
ALTER TABLE public.chat_typing DROP CONSTRAINT IF EXISTS chat_typing_user_id_fkey;
ALTER TABLE public.chat_typing 
  ADD CONSTRAINT chat_typing_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.4 message_reactions table
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;
ALTER TABLE public.message_reactions 
  ADD CONSTRAINT message_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.5 user_presence table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence' AND table_schema = 'public') THEN
    ALTER TABLE public.user_presence DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey;
    ALTER TABLE public.user_presence 
      ADD CONSTRAINT user_presence_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- STEP 2: Tables referencing profiles(id)
-- ==========================================

-- 2.1 resorts table
ALTER TABLE public.resorts DROP CONSTRAINT IF EXISTS resorts_owner_id_fkey;
ALTER TABLE public.resorts 
  ADD CONSTRAINT resorts_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.2 bookings table
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_guest_id_fkey;
ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_guest_id_fkey 
  FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.3 favorites table
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.favorites 
  ADD CONSTRAINT favorites_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.4 reviews table
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_guest_id_fkey;
ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_guest_id_fkey 
  FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.5 chats table
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_creator_id_fkey;
ALTER TABLE public.chats 
  ADD CONSTRAINT chats_creator_id_fkey 
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.6 chat_messages table
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS fk_cm_sender;
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT fk_cm_sender 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.7 chat_participants table
ALTER TABLE public.chat_participants DROP CONSTRAINT IF EXISTS fk_cp_user;
ALTER TABLE public.chat_participants 
  ADD CONSTRAINT fk_cp_user 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2.8 payment_submissions table
ALTER TABLE public.payment_submissions DROP CONSTRAINT IF EXISTS payment_submissions_submitted_by_fkey;
ALTER TABLE public.payment_submissions 
  ADD CONSTRAINT payment_submissions_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payment_submissions DROP CONSTRAINT IF EXISTS payment_submissions_verified_by_fkey;
ALTER TABLE public.payment_submissions 
  ADD CONSTRAINT payment_submissions_verified_by_fkey 
  FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2.9 payment_templates table
ALTER TABLE public.payment_templates DROP CONSTRAINT IF EXISTS payment_templates_owner_id_fkey;
ALTER TABLE public.payment_templates 
  ADD CONSTRAINT payment_templates_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ==========================================
-- DONE: All user-related cascades added
-- ==========================================
COMMENT ON TABLE public.profiles IS 'User profiles with CASCADE delete from auth.users for clean user removal';
