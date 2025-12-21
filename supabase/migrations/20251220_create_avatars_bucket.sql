-- Migration: create public avatars bucket and policies
-- Run in Supabase SQL editor or via Supabase CLI

begin;

-- Create the avatars bucket (public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies: allow public read, authenticated upload (idempotent via DO blocks)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read avatars'
  ) then
    create policy "Public read avatars"
      on storage.objects for select to public
      using (bucket_id = 'avatars');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload avatars'
  ) then
    create policy "Authenticated upload avatars"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars');
  end if;
end;
$$;

commit;
