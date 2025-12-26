-- Notifications table and RPC for cross-user inserts
begin;

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  metadata jsonb default '{}'::jsonb,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- RLS: users can see and update their own notifications
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete using (user_id = auth.uid());

-- Allow self-inserts (rare), but typical inserts use the RPC below
create policy notifications_insert_self on public.notifications
  for insert with check (user_id = auth.uid());

-- RPC to create notifications for another user; actor is auth.uid()
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.notifications(user_id, type, title, body, link, metadata, actor_id)
  values (p_user_id, p_type, p_title, p_body, p_link, coalesce(p_metadata, '{}'::jsonb), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text, jsonb) to authenticated;

commit;
