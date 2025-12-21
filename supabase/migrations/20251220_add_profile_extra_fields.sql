-- Migration: add phone, bio, location to profiles
begin;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists location text;

commit;
