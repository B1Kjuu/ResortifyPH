-- Migration: add avatar_url to profiles and prepare for image uploads
-- Run in Supabase SQL editor or via Supabase CLI

begin;

-- Add avatar_url column to profiles if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

commit;
