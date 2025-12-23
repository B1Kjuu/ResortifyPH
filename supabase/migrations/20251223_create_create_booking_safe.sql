-- RPC to safely create a pending booking only if it doesn't overlap any confirmed booking
-- Raises a friendly error message on overlap
CREATE OR REPLACE FUNCTION public.create_booking_safe(
  p_resort_id uuid,
  p_guest_id uuid,
  p_date_from date,
  p_date_to date,
  p_guest_count integer,
  p_resort_province text,
  p_resort_region_code text,
  p_resort_region_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conflict uuid;
  v_new_id uuid;
BEGIN
  -- Check overlap with any confirmed booking for the same resort
  SELECT b.id INTO v_conflict
  FROM public.bookings b
  WHERE b.resort_id = p_resort_id
    AND b.status = 'confirmed'
    AND daterange(b.date_from, b.date_to, '[]') && daterange(p_date_from, p_date_to, '[]')
  LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Selected dates overlap with an existing confirmed booking.' USING ERRCODE = 'check_violation';
  END IF;

  -- Insert pending booking
  INSERT INTO public.bookings (
    resort_id, guest_id, date_from, date_to, guest_count, status,
    resort_province, resort_region_code, resort_region_name
  ) VALUES (
    p_resort_id, p_guest_id, p_date_from, p_date_to, p_guest_count, 'pending',
    p_resort_province, p_resort_region_code, p_resort_region_name
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
