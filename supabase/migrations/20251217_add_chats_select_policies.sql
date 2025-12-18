-- Allow stakeholders to view chats even before joining as participants

-- Booking stakeholders (guest or resort owner) can view booking-based chats
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chats' and policyname = 'booking stakeholders can view chat'
  ) then
    create policy "booking stakeholders can view chat"
      on public.chats for select
      using (
        exists (
          select 1
          from public.bookings b
          join public.resorts r on r.id = b.resort_id
          where b.id = chats.booking_id
            and (b.guest_id = auth.uid() or r.owner_id = auth.uid())
        )
      );
  end if;
end $$;

-- Resort owner can view resort-based chats
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chats' and policyname = 'resort owner can view resort chat'
  ) then
    create policy "resort owner can view resort chat"
      on public.chats for select
      using (
        exists (
          select 1 from public.resorts r
          where r.id = chats.resort_id and r.owner_id = auth.uid()
        )
      );
  end if;
end $$;
