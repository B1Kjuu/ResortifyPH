-- Fix recursive RLS policy on chat_participants causing 42P17
-- Drops the recursive select policy and adds a safe self-view policy.

do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_participants' and policyname = 'participants manage membership'
  ) then
    drop policy "participants manage membership" on public.chat_participants;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_participants' and policyname = 'self view membership'
  ) then
    create policy "self view membership"
      on public.chat_participants for select
      using (user_id = auth.uid());
  end if;
end $$;

-- Keep existing insert policy: "self can join chat" (created in earlier migration)
-- No change needed here; this file focuses on fixing the select recursion.
-- Fix recursive policy on chat_participants causing 42P17 errors
-- Drop the old recursive policy if it exists
do $$ begin
  begin
    drop policy if exists "participants manage membership" on public.chat_participants;
  exception when others then null;
  end;
end $$;

-- Allow users to view only their own membership rows
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_participants' and policyname = 'self view membership'
  ) then
    create policy "self view membership"
      on public.chat_participants for select
      using (user_id = auth.uid());
  end if;
end $$;

-- Keep self-insert policy for joining chats
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_participants' and policyname = 'self can join chat'
  ) then
    create policy "self can join chat"
      on public.chat_participants for insert
      with check (user_id = auth.uid());
  end if;
end $$;
