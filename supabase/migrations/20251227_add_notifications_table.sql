-- Notifications audit log table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  to_email text not null,
  subject text not null,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);

-- Basic RLS: owners/admins can read their own notifications; admins can read all
alter table public.notifications enable row level security;
create policy notifications_owner_read on public.notifications
  for select using (auth.uid() = user_id);
create policy notifications_admin_read on public.notifications
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
