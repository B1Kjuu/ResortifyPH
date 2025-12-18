-- Allow chats without bookings by adding resort_id and making booking_id optional
alter table public.chats alter column booking_id drop not null;
alter table public.chats add column if not exists resort_id uuid references public.resorts(id) on delete cascade;

-- Ensure a chat is tied to exactly one: booking OR resort
do $$ begin
  alter table public.chats add constraint chats_booking_or_resort
    check (((booking_id is not null)::int + (resort_id is not null)::int) = 1);
exception when others then null;
end $$;

create index if not exists idx_chats_resort on public.chats(resort_id);
-- Keep unique chat per booking (optional, only applies when booking_id is set)
do $$ begin
  create unique index uq_chats_booking_not_null on public.chats(booking_id) where booking_id is not null;
exception when others then null;
end $$;
