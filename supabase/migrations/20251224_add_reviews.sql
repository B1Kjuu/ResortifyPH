-- Reviews system: table, constraints, RLS policies, and safe RPC

begin;

-- Ensure required extensions
create extension if not exists pgcrypto;

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  resort_id uuid not null references public.resorts(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Avoid duplicate reviews per booking by same guest
create unique index if not exists reviews_unique_booking_guest on public.reviews(booking_id, guest_id);
create index if not exists reviews_resort_idx on public.reviews(resort_id);

alter table public.reviews enable row level security;

-- Allow everyone to read reviews
create policy reviews_select_all on public.reviews
  for select
  using (true);

-- Allow insert only for the guest who completed a confirmed stay for the resort
create policy reviews_insert_guest on public.reviews
  for insert
  with check (
    guest_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.guest_id = auth.uid()
        and b.resort_id = resort_id
        and b.status = 'confirmed'
        and b.date_to < current_date
    )
  );

-- Allow update/delete only by the author
create policy reviews_update_author on public.reviews
  for update
  using (guest_id = auth.uid())
  with check (guest_id = auth.uid());

create policy reviews_delete_author on public.reviews
  for delete
  using (guest_id = auth.uid());

-- Trigger to keep updated_at fresh
create or replace function public.touch_reviews_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute procedure public.touch_reviews_updated_at();

-- Safe RPC to create a review with server-side eligibility checks
create or replace function public.create_review_safe(
  p_resort_id uuid,
  p_booking_id uuid,
  p_rating int,
  p_title text,
  p_content text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_guest uuid := auth.uid();
  v_exists boolean;
  v_review_id uuid;
begin
  if v_guest is null then
    raise exception 'not_authenticated';
  end if;

  -- Ensure rating bounds
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;

  -- Verify booking eligibility (confirmed, completed, matches resort, belongs to guest)
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and b.guest_id = v_guest
      and b.resort_id = p_resort_id
      and b.status = 'confirmed'
      and b.date_to < current_date
  ) into v_exists;

  if not v_exists then
    raise exception 'booking_not_eligible';
  end if;

  -- Prevent duplicate review for the same booking by this guest
  select exists (
    select 1 from public.reviews r
    where r.booking_id = p_booking_id and r.guest_id = v_guest
  ) into v_exists;

  if v_exists then
    raise exception 'duplicate_review';
  end if;

  insert into public.reviews(id, resort_id, booking_id, guest_id, rating, title, content)
  values (gen_random_uuid(), p_resort_id, p_booking_id, v_guest, p_rating, p_title, p_content)
  returning id into v_review_id;

  return v_review_id;
end$$;

commit;