-- Chat audit logs and per-user chat deletion (soft-delete)
begin;

set local search_path to public;

-- 1) Per-user soft delete on chats
alter table if exists chat_participants
  add column if not exists deleted_at timestamptz;

-- Ensure participant can update their own row (for soft-delete)
alter table chat_participants enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'chat_participants' and policyname = 'chat_parts_self_update'
  ) then
    create policy chat_parts_self_update
      on chat_participants for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- 2) Update get_user_chats RPC to hide deleted chats for current user
create or replace function public.get_user_chats()
returns table (
  chat_id uuid,
  booking_id uuid,
  resort_id uuid,
  my_role text,
  other_participant_name text,
  resort_name text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
language plpgsql
security definer
as $$
begin
  return query
  with me as (select auth.uid() as uid)
  select
    c.id as chat_id,
    c.booking_id,
    c.resort_id,
    mep.role as my_role,
    coalesce(p.full_name, p.email, 'User') as other_participant_name,
    r.name as resort_name,
    lm.content as last_message,
    lm.created_at as last_message_at,
    coalesce(uc.unread_count, 0) as unread_count
  from chats c
  join me on true
  join chat_participants mep on mep.chat_id = c.id and mep.user_id = me.uid and mep.deleted_at is null
  left join chat_participants op on op.chat_id = c.id and op.user_id <> me.uid
  left join profiles p on p.id = op.user_id
  left join bookings b on b.id = c.booking_id
  left join resorts r on r.id = coalesce(c.resort_id, b.resort_id)
  left join lateral (
    select m.content, m.created_at
    from chat_messages m
    where m.chat_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::int as unread_count
    from chat_messages m2
    where m2.chat_id = c.id
      and m2.read_at is null
      and m2.sender_id <> me.uid
  ) uc on true
  order by coalesce(lm.created_at, c.updated_at) desc;
end;
$$;

revoke all on function public.get_user_chats() from public;
grant execute on function public.get_user_chats() to authenticated;

-- 3) Immutable audit log for chat message history
create table if not exists chat_message_audit (
  id bigserial primary key,
  message_id uuid,
  chat_id uuid,
  sender_id uuid,
  content text,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  attachment_size integer,
  action text check (action in ('insert','update','delete')) not null,
  acted_by uuid,
  acted_at timestamptz not null default now(),
  previous_content text,
  previous_attachment_url text,
  previous_attachment_type text,
  previous_attachment_name text,
  previous_attachment_size integer
);

alter table chat_message_audit enable row level security;

-- Only admins can read; no update/delete policies defined
drop policy if exists chat_message_audit_admin_select on chat_message_audit;
create policy chat_message_audit_admin_select
  on chat_message_audit for select
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Allow inserts from triggers (broadly allow insert). No direct grants are given to clients by default.
drop policy if exists chat_message_audit_allow_insert on chat_message_audit;
create policy chat_message_audit_allow_insert
  on chat_message_audit for insert
  with check (true);

-- Trigger function to log changes on chat_messages
create or replace function public.log_chat_message_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  actor := auth.uid();
  if (tg_op = 'INSERT') then
    insert into chat_message_audit (
      message_id, chat_id, sender_id, content,
      attachment_url, attachment_type, attachment_name, attachment_size,
      action, acted_by
    ) values (
      new.id, new.chat_id, new.sender_id, new.content,
      new.attachment_url, new.attachment_type, new.attachment_name, new.attachment_size,
      'insert', actor
    );
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into chat_message_audit (
      message_id, chat_id, sender_id, content,
      attachment_url, attachment_type, attachment_name, attachment_size,
      action, acted_by,
      previous_content, previous_attachment_url, previous_attachment_type, previous_attachment_name, previous_attachment_size
    ) values (
      new.id, new.chat_id, new.sender_id, new.content,
      new.attachment_url, new.attachment_type, new.attachment_name, new.attachment_size,
      'update', actor,
      old.content, old.attachment_url, old.attachment_type, old.attachment_name, old.attachment_size
    );
    return new;
  elsif (tg_op = 'DELETE') then
    insert into chat_message_audit (
      message_id, chat_id, sender_id, content,
      attachment_url, attachment_type, attachment_name, attachment_size,
      action, acted_by
    ) values (
      old.id, old.chat_id, old.sender_id, old.content,
      old.attachment_url, old.attachment_type, old.attachment_name, old.attachment_size,
      'delete', actor
    );
    return old;
  end if;
  return null;
end;
$$;

-- Attach triggers to chat_messages table
drop trigger if exists trg_chat_messages_audit_ins on chat_messages;
drop trigger if exists trg_chat_messages_audit_upd on chat_messages;
drop trigger if exists trg_chat_messages_audit_del on chat_messages;

create trigger trg_chat_messages_audit_ins
  after insert on chat_messages
  for each row execute function public.log_chat_message_audit();

create trigger trg_chat_messages_audit_upd
  after update on chat_messages
  for each row execute function public.log_chat_message_audit();

create trigger trg_chat_messages_audit_del
  after delete on chat_messages
  for each row execute function public.log_chat_message_audit();

commit;
