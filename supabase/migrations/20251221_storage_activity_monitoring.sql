-- Storage activity monitoring: log inserts and flag high upload rates
begin;

create table if not exists public.storage_activity (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  bucket_id text not null,
  object_name text not null,
  owner uuid,
  size_bytes bigint
);

create table if not exists public.storage_alerts (
  id bigserial primary key,
  detected_at timestamptz not null default now(),
  owner uuid,
  bucket_id text,
  object_count int,
  window_minutes int,
  note text
);

create or replace function public.log_storage_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.storage_activity (bucket_id, object_name, owner)
  values (new.bucket_id, new.name, new.owner);
  return new;
end;
$$;

-- Attach to storage.objects
create trigger on_storage_objects_insert
  after insert on storage.objects
  for each row execute function public.log_storage_insert();

-- Helper function to flag high rates (e.g., > 20 objects in 10 minutes)
create or replace function public.flag_high_upload_rate()
returns void
language plpgsql
as $$
begin
  insert into public.storage_alerts (owner, bucket_id, object_count, window_minutes, note)
  select owner, bucket_id, count(*) as object_count, 10 as window_minutes, 'High upload rate'
  from public.storage_activity
  where occurred_at > now() - interval '10 minutes'
  group by owner, bucket_id
  having count(*) > 20;
end;
$$;

commit;
