-- Admin-only RPC to list bookings for a specific resort
create or replace function public.get_resort_bookings_admin(
  p_resort_id uuid
)
returns table (
  booking_id uuid,
  resort_id uuid,
  date_from date,
  date_to date,
  guest_count int,
  status text,
  cancellation_status text,
  cancellation_requested_at timestamptz,
  cancellation_reason text,
  created_at timestamptz,
  guest_full_name text,
  guest_email text
)
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
begin
  -- Ensure only admins can call this function
  select coalesce(is_admin,false) into v_is_admin from public.profiles where id = v_uid;
  if v_uid is null or not v_is_admin then
    raise exception 'not_authorized';
  end if;

  return query
  select
    b.id as booking_id,
    b.resort_id,
    b.date_from,
    b.date_to,
    b.guest_count,
    b.status,
    b.cancellation_status,
    b.cancellation_requested_at,
    b.cancellation_reason,
    b.created_at,
    p.full_name as guest_full_name,
    p.email as guest_email
  from public.bookings b
  join public.profiles p on p.id = b.guest_id
  where b.resort_id = p_resort_id
  order by b.created_at desc;
end;
$$;
