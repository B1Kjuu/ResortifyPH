-- Fix review eligibility to allow same-day reviews for daytour bookings
-- Previous check: date_to < current_date (strictly in the past)
-- New check: date_to <= current_date (includes today for same-day checkout)

begin;

create or replace function public.create_review_safe(
  p_resort_id uuid,
  p_booking_id uuid,
  p_rating int,
  p_title text,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
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
  -- Changed to <= to allow same-day reviews for daytour bookings
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and b.guest_id = v_guest
      and b.resort_id = p_resort_id
      and b.status = 'confirmed'
      and b.date_to <= current_date
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
