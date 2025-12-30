-- Fix duplicate chats issue
-- This migration deduplicates existing chats and ensures uniqueness is enforced

BEGIN;

-- 1) Merge duplicate booking-based chats (keep oldest by created_at, merge messages/participants)
WITH booking_dupes AS (
  SELECT DISTINCT ON (booking_id) id as canonical_id, booking_id
  FROM public.chats
  WHERE booking_id IS NOT NULL
  ORDER BY booking_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.booking_id, bd.canonical_id
  FROM public.chats c
  JOIN booking_dupes bd ON c.booking_id = bd.booking_id
  WHERE c.id <> bd.canonical_id
)
-- Move messages to canonical chat
UPDATE public.chat_messages m
SET chat_id = dc.canonical_id
FROM dupe_chats dc
WHERE m.chat_id = dc.id;

-- Move participants to canonical chat (ignore conflicts)
WITH booking_dupes AS (
  SELECT DISTINCT ON (booking_id) id as canonical_id, booking_id
  FROM public.chats
  WHERE booking_id IS NOT NULL
  ORDER BY booking_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.booking_id, bd.canonical_id
  FROM public.chats c
  JOIN booking_dupes bd ON c.booking_id = bd.booking_id
  WHERE c.id <> bd.canonical_id
)
INSERT INTO public.chat_participants (chat_id, user_id, role, joined_at)
SELECT dc.canonical_id, p.user_id, p.role, p.joined_at
FROM public.chat_participants p
JOIN dupe_chats dc ON p.chat_id = dc.id
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- Delete duplicate participants
WITH booking_dupes AS (
  SELECT DISTINCT ON (booking_id) id as canonical_id, booking_id
  FROM public.chats
  WHERE booking_id IS NOT NULL
  ORDER BY booking_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.booking_id, bd.canonical_id
  FROM public.chats c
  JOIN booking_dupes bd ON c.booking_id = bd.booking_id
  WHERE c.id <> bd.canonical_id
)
DELETE FROM public.chat_participants p
USING dupe_chats dc
WHERE p.chat_id = dc.id;

-- Delete duplicate chats
WITH booking_dupes AS (
  SELECT DISTINCT ON (booking_id) id as canonical_id, booking_id
  FROM public.chats
  WHERE booking_id IS NOT NULL
  ORDER BY booking_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.booking_id, bd.canonical_id
  FROM public.chats c
  JOIN booking_dupes bd ON c.booking_id = bd.booking_id
  WHERE c.id <> bd.canonical_id
)
DELETE FROM public.chats c
USING dupe_chats dc
WHERE c.id = dc.id;

-- 2) Create unique index on booking_id (if not exists)
DROP INDEX IF EXISTS idx_chats_booking_id_unique;
CREATE UNIQUE INDEX idx_chats_booking_id_unique ON public.chats (booking_id) WHERE booking_id IS NOT NULL;

-- 3) Similarly deduplicate resort+creator chats
WITH resort_dupes AS (
  SELECT DISTINCT ON (resort_id, creator_id) id as canonical_id, resort_id, creator_id
  FROM public.chats
  WHERE resort_id IS NOT NULL AND creator_id IS NOT NULL AND booking_id IS NULL
  ORDER BY resort_id, creator_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.resort_id, c.creator_id, rd.canonical_id
  FROM public.chats c
  JOIN resort_dupes rd ON c.resort_id = rd.resort_id AND c.creator_id = rd.creator_id
  WHERE c.id <> rd.canonical_id AND c.booking_id IS NULL
)
UPDATE public.chat_messages m
SET chat_id = dc.canonical_id
FROM dupe_chats dc
WHERE m.chat_id = dc.id;

WITH resort_dupes AS (
  SELECT DISTINCT ON (resort_id, creator_id) id as canonical_id, resort_id, creator_id
  FROM public.chats
  WHERE resort_id IS NOT NULL AND creator_id IS NOT NULL AND booking_id IS NULL
  ORDER BY resort_id, creator_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.resort_id, c.creator_id, rd.canonical_id
  FROM public.chats c
  JOIN resort_dupes rd ON c.resort_id = rd.resort_id AND c.creator_id = rd.creator_id
  WHERE c.id <> rd.canonical_id AND c.booking_id IS NULL
)
INSERT INTO public.chat_participants (chat_id, user_id, role, joined_at)
SELECT dc.canonical_id, p.user_id, p.role, p.joined_at
FROM public.chat_participants p
JOIN dupe_chats dc ON p.chat_id = dc.id
ON CONFLICT (chat_id, user_id) DO NOTHING;

WITH resort_dupes AS (
  SELECT DISTINCT ON (resort_id, creator_id) id as canonical_id, resort_id, creator_id
  FROM public.chats
  WHERE resort_id IS NOT NULL AND creator_id IS NOT NULL AND booking_id IS NULL
  ORDER BY resort_id, creator_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.resort_id, c.creator_id, rd.canonical_id
  FROM public.chats c
  JOIN resort_dupes rd ON c.resort_id = rd.resort_id AND c.creator_id = rd.creator_id
  WHERE c.id <> rd.canonical_id AND c.booking_id IS NULL
)
DELETE FROM public.chat_participants p
USING dupe_chats dc
WHERE p.chat_id = dc.id;

WITH resort_dupes AS (
  SELECT DISTINCT ON (resort_id, creator_id) id as canonical_id, resort_id, creator_id
  FROM public.chats
  WHERE resort_id IS NOT NULL AND creator_id IS NOT NULL AND booking_id IS NULL
  ORDER BY resort_id, creator_id, created_at ASC
),
dupe_chats AS (
  SELECT c.id, c.resort_id, c.creator_id, rd.canonical_id
  FROM public.chats c
  JOIN resort_dupes rd ON c.resort_id = rd.resort_id AND c.creator_id = rd.creator_id
  WHERE c.id <> rd.canonical_id AND c.booking_id IS NULL
)
DELETE FROM public.chats c
USING dupe_chats dc
WHERE c.id = dc.id;

-- 4) Create unique index on resort_id + creator_id for non-booking chats
DROP INDEX IF EXISTS idx_chats_resort_creator_unique;
CREATE UNIQUE INDEX idx_chats_resort_creator_unique ON public.chats (resort_id, creator_id) 
WHERE resort_id IS NOT NULL AND booking_id IS NULL;

COMMIT;
