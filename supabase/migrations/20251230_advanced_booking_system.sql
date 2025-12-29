-- =====================================================
-- Advanced Booking System Migration
-- Supports: Time-slot based availability, custom time slots,
-- guest tiers, and pricing matrix per resort
-- =====================================================

-- 1. Create resort_time_slots table (owner-customizable time slots)
CREATE TABLE IF NOT EXISTS public.resort_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('daytour', 'overnight', '22hrs')),
  label TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  crosses_midnight BOOLEAN NOT NULL DEFAULT false,
  hours NUMERIC(4,1) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resort_id, label)
);

-- 2. Create resort_guest_tiers table (owner-customizable guest tiers)
CREATE TABLE IF NOT EXISTS public.resort_guest_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  min_guests INT NOT NULL CHECK (min_guests >= 1),
  max_guests INT, -- NULL means unlimited
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resort_id, label),
  CHECK (max_guests IS NULL OR max_guests >= min_guests)
);

-- 3. Create resort_pricing_matrix table (the actual prices)
CREATE TABLE IF NOT EXISTS public.resort_pricing_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES public.resort_time_slots(id) ON DELETE CASCADE,
  guest_tier_id UUID NOT NULL REFERENCES public.resort_guest_tiers(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resort_id, time_slot_id, guest_tier_id, day_type)
);

-- 4. Add new columns to bookings table if not exists
DO $$
BEGIN
  -- Time slot reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'resort_time_slot_id') THEN
    ALTER TABLE public.bookings ADD COLUMN resort_time_slot_id UUID REFERENCES public.resort_time_slots(id);
  END IF;
  
  -- Guest tier reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'resort_guest_tier_id') THEN
    ALTER TABLE public.bookings ADD COLUMN resort_guest_tier_id UUID REFERENCES public.resort_guest_tiers(id);
  END IF;
  
  -- Actual check-in/out times from the slot
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'actual_check_in') THEN
    ALTER TABLE public.bookings ADD COLUMN actual_check_in TIME;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'actual_check_out') THEN
    ALTER TABLE public.bookings ADD COLUMN actual_check_out TIME;
  END IF;
  
  -- Day type at time of booking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'booked_day_type') THEN
    ALTER TABLE public.bookings ADD COLUMN booked_day_type TEXT CHECK (booked_day_type IN ('weekday', 'weekend'));
  END IF;
END $$;

-- 5. Add resort-level settings columns if not exists
DO $$
BEGIN
  -- Downpayment percentage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resorts' AND column_name = 'downpayment_percentage') THEN
    ALTER TABLE public.resorts ADD COLUMN downpayment_percentage INT DEFAULT 50 CHECK (downpayment_percentage >= 0 AND downpayment_percentage <= 100);
  END IF;
  
  -- Allow same-day daytour + overnight
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resorts' AND column_name = 'allow_split_day') THEN
    ALTER TABLE public.resorts ADD COLUMN allow_split_day BOOLEAN DEFAULT true;
  END IF;
  
  -- Use advanced pricing (vs legacy simple pricing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resorts' AND column_name = 'use_advanced_pricing') THEN
    ALTER TABLE public.resorts ADD COLUMN use_advanced_pricing BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resort_time_slots_resort ON public.resort_time_slots(resort_id);
CREATE INDEX IF NOT EXISTS idx_resort_time_slots_active ON public.resort_time_slots(resort_id, is_active);
CREATE INDEX IF NOT EXISTS idx_resort_guest_tiers_resort ON public.resort_guest_tiers(resort_id);
CREATE INDEX IF NOT EXISTS idx_resort_pricing_matrix_resort ON public.resort_pricing_matrix(resort_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON public.bookings(resort_time_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resort_date_status ON public.bookings(resort_id, date_from, status);

-- 7. Function to check time slot availability (supports partial day booking)
CREATE OR REPLACE FUNCTION public.check_time_slot_availability(
  p_resort_id UUID,
  p_date DATE,
  p_time_slot_id UUID,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_allow_split BOOLEAN;
  v_has_conflict BOOLEAN := false;
BEGIN
  -- Get the requested time slot details
  SELECT * INTO v_slot FROM public.resort_time_slots WHERE id = p_time_slot_id;
  IF v_slot IS NULL THEN
    RETURN false; -- Invalid slot
  END IF;
  
  -- Get resort settings
  SELECT COALESCE(allow_split_day, true) INTO v_allow_split 
  FROM public.resorts WHERE id = p_resort_id;
  
  -- Check for conflicts with existing confirmed bookings
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.resort_time_slots ts ON ts.id = b.resort_time_slot_id
    WHERE b.resort_id = p_resort_id
      AND b.date_from = p_date
      AND b.status IN ('pending', 'confirmed')
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND (
        -- Same slot type = conflict
        ts.slot_type = v_slot.slot_type
        -- 22hrs conflicts with everything
        OR ts.slot_type = '22hrs'
        OR v_slot.slot_type = '22hrs'
        -- If split day not allowed, daytour + overnight = conflict
        OR (NOT v_allow_split AND (
          (ts.slot_type = 'daytour' AND v_slot.slot_type = 'overnight')
          OR (ts.slot_type = 'overnight' AND v_slot.slot_type = 'daytour')
        ))
      )
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$;

-- 8. Function to get available time slots for a date
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_resort_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_id UUID,
  slot_type TEXT,
  label TEXT,
  start_time TIME,
  end_time TIME,
  hours NUMERIC,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id as slot_id,
    ts.slot_type,
    ts.label,
    ts.start_time,
    ts.end_time,
    ts.hours,
    public.check_time_slot_availability(p_resort_id, p_date, ts.id) as is_available
  FROM public.resort_time_slots ts
  WHERE ts.resort_id = p_resort_id
    AND ts.is_active = true
  ORDER BY ts.sort_order, ts.start_time;
END;
$$;

-- 9. Function to get price for a booking
CREATE OR REPLACE FUNCTION public.get_booking_price(
  p_resort_id UUID,
  p_time_slot_id UUID,
  p_guest_count INT,
  p_date DATE
)
RETURNS TABLE (
  price NUMERIC,
  guest_tier_id UUID,
  guest_tier_label TEXT,
  day_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_type TEXT;
  v_is_weekend BOOLEAN;
  v_is_holiday BOOLEAN;
BEGIN
  -- Determine day type
  v_is_weekend := EXTRACT(DOW FROM p_date) IN (0, 6); -- Sunday = 0, Saturday = 6
  
  -- Check if date is in holidays (simplified - you may want to expand this)
  v_is_holiday := p_date IN (
    '2025-01-01', '2025-01-29', '2025-02-25', '2025-04-09', '2025-04-17', 
    '2025-04-18', '2025-04-19', '2025-05-01', '2025-06-12', '2025-08-21',
    '2025-08-25', '2025-11-01', '2025-11-02', '2025-11-30', '2025-12-08',
    '2025-12-24', '2025-12-25', '2025-12-30', '2025-12-31',
    '2026-01-01', '2026-02-17', '2026-02-25', '2026-04-02', '2026-04-03',
    '2026-04-04', '2026-04-09', '2026-05-01', '2026-06-12', '2026-08-21',
    '2026-08-31', '2026-11-01', '2026-11-02', '2026-11-30', '2026-12-08',
    '2026-12-24', '2026-12-25', '2026-12-30', '2026-12-31'
  );
  
  IF v_is_weekend OR v_is_holiday THEN
    v_day_type := 'weekend';
  ELSE
    v_day_type := 'weekday';
  END IF;
  
  RETURN QUERY
  SELECT 
    pm.price,
    gt.id as guest_tier_id,
    gt.label as guest_tier_label,
    pm.day_type
  FROM public.resort_guest_tiers gt
  JOIN public.resort_pricing_matrix pm ON pm.guest_tier_id = gt.id
  WHERE gt.resort_id = p_resort_id
    AND pm.time_slot_id = p_time_slot_id
    AND pm.day_type = v_day_type
    AND gt.is_active = true
    AND p_guest_count >= gt.min_guests
    AND (gt.max_guests IS NULL OR p_guest_count <= gt.max_guests)
  ORDER BY gt.sort_order
  LIMIT 1;
END;
$$;

-- 10. Updated safe booking creation with time slot support
CREATE OR REPLACE FUNCTION public.create_booking_with_timeslot(
  p_resort_id UUID,
  p_guest_id UUID,
  p_date DATE,
  p_time_slot_id UUID,
  p_guest_count INT,
  p_children_count INT DEFAULT 0,
  p_pets_count INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_slot RECORD;
  v_price_info RECORD;
  v_downpayment_pct INT;
  v_date_to DATE;
  v_is_available BOOLEAN;
BEGIN
  -- Check if resort exists and get settings
  SELECT downpayment_percentage INTO v_downpayment_pct
  FROM public.resorts WHERE id = p_resort_id;
  
  IF v_downpayment_pct IS NULL THEN
    RAISE EXCEPTION 'resort_not_found';
  END IF;
  
  -- Prevent self-booking
  IF EXISTS (SELECT 1 FROM public.resorts WHERE id = p_resort_id AND owner_id = p_guest_id) THEN
    RAISE EXCEPTION 'self_booking_not_allowed';
  END IF;
  
  -- Check for duplicate pending booking
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE resort_id = p_resort_id
      AND guest_id = p_guest_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'duplicate_pending';
  END IF;
  
  -- Get time slot details
  SELECT * INTO v_slot FROM public.resort_time_slots WHERE id = p_time_slot_id AND resort_id = p_resort_id;
  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'invalid_time_slot';
  END IF;
  
  -- Check availability
  v_is_available := public.check_time_slot_availability(p_resort_id, p_date, p_time_slot_id);
  IF NOT v_is_available THEN
    RAISE EXCEPTION 'time_slot_not_available';
  END IF;
  
  -- Get pricing
  SELECT * INTO v_price_info FROM public.get_booking_price(p_resort_id, p_time_slot_id, p_guest_count, p_date);
  IF v_price_info IS NULL THEN
    RAISE EXCEPTION 'no_price_configured';
  END IF;
  
  -- Calculate date_to (next day if crosses midnight)
  IF v_slot.crosses_midnight THEN
    v_date_to := p_date + 1;
  ELSE
    v_date_to := p_date;
  END IF;
  
  -- Insert booking
  INSERT INTO public.bookings (
    resort_id,
    guest_id,
    date_from,
    date_to,
    guest_count,
    children_count,
    pets_count,
    resort_time_slot_id,
    resort_guest_tier_id,
    actual_check_in,
    actual_check_out,
    booked_day_type,
    booking_type,
    total_price,
    downpayment_amount,
    status
  ) VALUES (
    p_resort_id,
    p_guest_id,
    p_date,
    v_date_to,
    GREATEST(p_guest_count, 1),
    COALESCE(p_children_count, 0),
    COALESCE(p_pets_count, 0),
    p_time_slot_id,
    v_price_info.guest_tier_id,
    v_slot.start_time,
    v_slot.end_time,
    v_price_info.day_type,
    v_slot.slot_type,
    v_price_info.price,
    ROUND(v_price_info.price * COALESCE(v_downpayment_pct, 50) / 100),
    'pending'
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$;

-- 11. Helper function to seed default time slots for a resort
CREATE OR REPLACE FUNCTION public.seed_default_time_slots(p_resort_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default daytour slot
  INSERT INTO public.resort_time_slots (resort_id, slot_type, label, start_time, end_time, crosses_midnight, hours, sort_order)
  VALUES 
    (p_resort_id, 'daytour', 'Daytour: 8:00 AM - 5:00 PM', '08:00', '17:00', false, 9, 1),
    (p_resort_id, 'overnight', 'Overnight: 7:00 PM - 6:00 AM', '19:00', '06:00', true, 11, 2),
    (p_resort_id, '22hrs', '22 Hours: 8:00 AM - 6:00 AM (+1 day)', '08:00', '06:00', true, 22, 3)
  ON CONFLICT (resort_id, label) DO NOTHING;
END;
$$;

-- 12. Helper function to seed default guest tiers for a resort
CREATE OR REPLACE FUNCTION public.seed_default_guest_tiers(p_resort_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.resort_guest_tiers (resort_id, label, min_guests, max_guests, sort_order)
  VALUES 
    (p_resort_id, 'Up to 10 guests', 1, 10, 1),
    (p_resort_id, '11-20 guests', 11, 20, 2),
    (p_resort_id, '21-30 guests', 21, 30, 3),
    (p_resort_id, '31+ guests', 31, NULL, 4)
  ON CONFLICT (resort_id, label) DO NOTHING;
END;
$$;

-- 13. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resort_time_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resort_guest_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resort_pricing_matrix TO authenticated;

-- 14. RLS Policies
ALTER TABLE public.resort_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_guest_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_pricing_matrix ENABLE ROW LEVEL SECURITY;

-- Time slots: Anyone can view, only owner can modify
CREATE POLICY "Anyone can view time slots" ON public.resort_time_slots
  FOR SELECT USING (true);
  
CREATE POLICY "Owners can manage their time slots" ON public.resort_time_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.resorts WHERE id = resort_id AND owner_id = auth.uid())
  );

-- Guest tiers: Anyone can view, only owner can modify
CREATE POLICY "Anyone can view guest tiers" ON public.resort_guest_tiers
  FOR SELECT USING (true);
  
CREATE POLICY "Owners can manage their guest tiers" ON public.resort_guest_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.resorts WHERE id = resort_id AND owner_id = auth.uid())
  );

-- Pricing matrix: Anyone can view, only owner can modify
CREATE POLICY "Anyone can view pricing" ON public.resort_pricing_matrix
  FOR SELECT USING (true);
  
CREATE POLICY "Owners can manage their pricing" ON public.resort_pricing_matrix
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.resorts WHERE id = resort_id AND owner_id = auth.uid())
  );

-- 15. Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_resort_time_slots_updated_at ON public.resort_time_slots;
CREATE TRIGGER update_resort_time_slots_updated_at
  BEFORE UPDATE ON public.resort_time_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resort_guest_tiers_updated_at ON public.resort_guest_tiers;
CREATE TRIGGER update_resort_guest_tiers_updated_at
  BEFORE UPDATE ON public.resort_guest_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resort_pricing_matrix_updated_at ON public.resort_pricing_matrix;
CREATE TRIGGER update_resort_pricing_matrix_updated_at
  BEFORE UPDATE ON public.resort_pricing_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.resort_time_slots IS 'Owner-customizable time slots for each resort (daytour, overnight, 22hrs)';
COMMENT ON TABLE public.resort_guest_tiers IS 'Owner-customizable guest count tiers for pricing';
COMMENT ON TABLE public.resort_pricing_matrix IS 'Pricing matrix: time_slot x guest_tier x day_type = price';
