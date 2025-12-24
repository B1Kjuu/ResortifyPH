-- Add DELETE policy for bookings table
-- Allows owners to delete bookings for their resorts and guests to delete their own bookings

begin;

-- Create DELETE policy for resort owners (can delete bookings for their resorts)
create policy "bookings_delete_owner"
  on public.bookings for delete to authenticated
  using (
    exists (
      select 1 from public.resorts r 
      where r.id = bookings.resort_id 
      and r.owner_id = auth.uid()
    )
  );

-- Create DELETE policy for guests (can delete their own bookings)
create policy "bookings_delete_guest"
  on public.bookings for delete to authenticated
  using (guest_id = auth.uid());

commit;
