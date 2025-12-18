create extension if not exists pgcrypto;
-- Chat system schema linked to bookings
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_chats_booking foreign key (booking_id) references public.bookings(id) on delete cascade
);

create table if not exists public.chat_participants (
  chat_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('guest','owner','admin')),
  joined_at timestamptz not null default now(),
  primary key(chat_id, user_id),
  constraint fk_cp_chat foreign key (chat_id) references public.chats(id) on delete cascade,
  constraint fk_cp_user foreign key (user_id) references public.profiles(id) on delete cascade
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint fk_cm_chat foreign key (chat_id) references public.chats(id) on delete cascade,
  constraint fk_cm_sender foreign key (sender_id) references public.profiles(id) on delete set null
);

-- Indexes
create index if not exists idx_chats_booking on public.chats(booking_id);
create index if not exists idx_messages_chat on public.chat_messages(chat_id);
create index if not exists idx_messages_sender on public.chat_messages(sender_id);

-- Realtime configurations
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when others then null;
end $$;

-- Row Level Security
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

-- Policies: only participants can select/insert messages for their chat
create unique index if not exists uq_chats_booking on public.chats(booking_id);

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chats' and policyname = 'participants can view chat'
  ) then
    create policy "participants can view chat"
      on public.chats for select
      using (exists (
        select 1 from public.chat_participants cp
        where cp.chat_id = chats.id and cp.user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chats' and policyname = 'authenticated can create chat'
  ) then
    create policy "authenticated can create chat"
      on public.chats for insert
      with check (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'participants can view messages'
  ) then
    create policy "participants can view messages"
      on public.chat_messages for select
      using (exists (
        select 1 from public.chat_participants cp
        where cp.chat_id = chat_messages.chat_id and cp.user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'participants can send messages'
  ) then
    create policy "participants can send messages"
      on public.chat_messages for insert
      with check (exists (
        select 1 from public.chat_participants cp
        where cp.chat_id = chat_messages.chat_id and cp.user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'participants can mark read'
  ) then
    create policy "participants can mark read"
      on public.chat_messages for update
      using (exists (
        select 1 from public.chat_participants cp
        where cp.chat_id = chat_messages.chat_id and cp.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.chat_participants cp
        where cp.chat_id = chat_messages.chat_id and cp.user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_participants' and policyname = 'participants manage membership'
  ) then
    create policy "participants manage membership"
      on public.chat_participants for select
      using (user_id = auth.uid() or exists (
        select 1 from public.chat_participants cp2 where cp2.chat_id = chat_participants.chat_id and cp2.user_id = auth.uid()
      ));
  end if;
end $$;

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
