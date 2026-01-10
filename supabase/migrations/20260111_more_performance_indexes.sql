-- Additional performance indexes for high-traffic patterns
-- Date: 2026-01-11

BEGIN;

-- Availability query pattern:
--   where resort_id = ?
--     and date_from <= :date
--     and date_to >= :date
--     and status in ('pending','confirmed')
-- These indexes help under load (planner can pick best available).
CREATE INDEX IF NOT EXISTS idx_bookings_resort_status_date_span
  ON public.bookings (resort_id, status, date_from, date_to);

CREATE INDEX IF NOT EXISTS idx_bookings_resort_active_date_span
  ON public.bookings (resort_id, date_from, date_to)
  WHERE status IN ('pending', 'confirmed');

-- Guest dashboard: filter by guest_id, sort by created_at desc
CREATE INDEX IF NOT EXISTS idx_bookings_guest_created
  ON public.bookings (guest_id, created_at DESC);

-- Owner/admin views: join by resort_id, sort by created_at desc
CREATE INDEX IF NOT EXISTS idx_bookings_resort_created
  ON public.bookings (resort_id, created_at DESC);

-- Time slots: filter by resort_id + is_active, order by sort_order
CREATE INDEX IF NOT EXISTS idx_resort_time_slots_resort_active_sort
  ON public.resort_time_slots (resort_id, is_active, sort_order);

ANALYZE public.bookings;
ANALYZE public.resort_time_slots;

COMMIT;
