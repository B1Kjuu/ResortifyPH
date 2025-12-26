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
create policy if not exists reports_insert_self
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Policy: reporters can view their own reports
create policy if not exists reports_select_self
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Policy: admins can view all reports
create policy if not exists reports_select_admin
  on public.reports for select
  to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false) = true));

-- Policy: admins can update report status
create policy if not exists reports_update_admin
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

create trigger trg_reports_updated
before update on public.reports
for each row execute function public.touch_reports_updated_at();
