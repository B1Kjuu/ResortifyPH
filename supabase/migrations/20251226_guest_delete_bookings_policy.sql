-- Allow guests to delete their own past or rejected bookings
begin;

alter table public.bookings enable row level security;

-- Policy: guest can delete when booking is their own AND (status = 'rejected' OR date_to < now())
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookings' and policyname = 'guest can delete past or rejected'
  ) then
    create policy "guest can delete past or rejected"
      on public.bookings for delete
      using (
        guest_id = auth.uid() and (
          status = 'rejected' or date_to < now()
        )
      );
  end if;
end $$;

commit;
