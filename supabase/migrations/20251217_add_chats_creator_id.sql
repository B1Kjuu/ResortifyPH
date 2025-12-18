-- Add creator_id to chats so creators can read their freshly inserted rows
alter table public.chats add column if not exists creator_id uuid references public.profiles(id) on delete set null;

-- Update insert policy to require creator_id = auth.uid()
do $$ begin
  begin
    drop policy if exists "authenticated can create chat" on public.chats;
  exception when others then null;
  end;
  create policy "authenticated can create chat"
    on public.chats for insert
    with check (auth.uid() is not null and creator_id = auth.uid());
end $$;

-- Allow chat creators to view their own chats (so RETURNING works)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chats' and policyname = 'creator can view chat'
  ) then
    create policy "creator can view chat"
      on public.chats for select
      using (creator_id = auth.uid());
  end if;
end $$;
