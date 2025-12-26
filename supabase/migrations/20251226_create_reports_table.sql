-- Create reports table for moderation
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  chat_id uuid null,
  message_id uuid null,
  target_user_id uuid null,
  reason text not null,
  status text not null default 'open', -- open | in_review | resolved | rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

-- Helpful indexes
create index if not exists idx_reports_chat_id on public.reports(chat_id);
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status);

-- Row Level Security
alter table public.reports enable row level security;

-- Policy: reporters can insert their own reports
drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Policy: reporters can view their own reports
drop policy if exists reports_select_self on public.reports;
create policy reports_select_self
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Policy: admins can view all reports
drop policy if exists reports_select_admin on public.reports;
create policy reports_select_admin
  on public.reports for select
  to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false) = true));

-- Policy: admins can update report status
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin
  on public.reports for update
  to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false) = true))
  with check (exists(select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false) = true));

-- Trigger to keep updated_at current
create or replace function public.touch_reports_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reports_updated on public.reports;
create trigger trg_reports_updated
before update on public.reports
for each row execute function public.touch_reports_updated_at();

-- Notify admins when a new report is submitted
create or replace function public.notify_admins_on_report()
returns trigger as $$
declare
  admin_rec record;
  meta jsonb;
begin
  -- Build metadata payload for notification
  meta := jsonb_build_object(
    'report_id', new.id,
    'chat_id', new.chat_id,
    'message_id', new.message_id,
    'reporter_id', new.reporter_id,
    'status', new.status
  );

  -- Loop through admins and send a notification
  for admin_rec in
    select id from public.profiles where coalesce(is_admin,false) = true
  loop
    -- Call existing RPC/function to create a notification
    perform public.create_notification(
      p_user_id := admin_rec.id,
      p_type := 'moderation_report',
      p_title := 'New report submitted',
      p_body := coalesce(new.reason, ''),
      p_link := '/admin/command-center',
      p_metadata := meta
    );
  end loop;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reports_notify_admins on public.reports;
create trigger trg_reports_notify_admins
after insert on public.reports
for each row execute function public.notify_admins_on_report();

-- Moderation actions audit table
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  admin_id uuid not null,
  action text not null check (action in ('in_review','resolved','rejected')),
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_actions_report_id on public.moderation_actions(report_id);

alter table public.moderation_actions enable row level security;

-- Admins can insert and view all moderation actions
drop policy if exists moderation_actions_admin_select on public.moderation_actions;
create policy moderation_actions_admin_select
  on public.moderation_actions for select
  to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false) = true));

drop policy if exists moderation_actions_admin_insert on public.moderation_actions;
create policy moderation_actions_admin_insert
  on public.moderation_actions for insert
  to authenticated
  with check (exists(select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false) = true));

-- Reporters can view actions related to their own reports
drop policy if exists moderation_actions_reporter_select on public.moderation_actions;
create policy moderation_actions_reporter_select
  on public.moderation_actions for select
  to authenticated
  using (
    exists(
      select 1
      from public.reports r
      where r.id = moderation_actions.report_id
        and r.reporter_id = auth.uid()
    )
  );
