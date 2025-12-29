-- Create booking RPC function to support client-side booking
-- Ensures no overlap with confirmed bookings and inserts a pending booking
-- Ignores province/region parameters if not used by schema

create or replace function public.create_booking_safe(
  p_resort_id uuid,
  p_guest_id uuid,
  p_date_from date,
  p_date_to date,
  p_guest_count int,
  p_resort_province text,
  p_resort_region_code text,
  p_resort_region_name text,
  p_stay_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_now date := now()::date;
  v_auth uuid := auth.uid();
  v_overlap boolean := false;
  v_pending_exists boolean := false;
begin
  -- Basic validation
  if p_resort_id is null or p_guest_id is null then
    raise exception 'Missing resort_id or guest_id';
  end if;
  if p_date_from is null or p_date_to is null then
    raise exception 'Missing dates';
  end if;
  if p_date_from > p_date_to then
    raise exception 'date_from must be <= date_to';
  end if;

  -- Ensure caller matches guest
  if v_auth is null or v_auth <> p_guest_id then
    raise exception 'unauthorized';
  end if;

  -- Prevent owners from booking their own resort
  if exists (
    select 1 from public.resorts r
    where r.id = p_resort_id and r.owner_id = p_guest_id
  ) then
    raise exception 'self_booking_not_allowed';
  end if;

  -- Prevent overlap with confirmed bookings for this resort
  select exists (
    select 1 from public.bookings b
    where b.resort_id = p_resort_id
      and b.status = 'confirmed'
      and not (p_date_to < b.date_from or p_date_from > b.date_to)
  ) into v_overlap;

  if v_overlap then
    raise exception 'overlap';
  end if;

  -- Prevent multiple pending bookings by the same guest for the same resort
  select exists (
    select 1 from public.bookings b
    where b.resort_id = p_resort_id
      and b.guest_id = p_guest_id
      and b.status = 'pending'
  ) into v_pending_exists;

  if v_pending_exists then
    raise exception 'duplicate_pending';
  end if;

  -- Insert pending booking
  insert into public.bookings (resort_id, guest_id, date_from, date_to, guest_count, status)
  values (p_resort_id, p_guest_id, p_date_from, p_date_to, greatest(p_guest_count, 1), 'pending')
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;
