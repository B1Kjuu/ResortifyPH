-- Tighten bookings SELECT RLS: remove admin-wide visibility.
-- Admins now use get_resort_bookings_admin RPC for resort-scoped views.

alter table public.bookings enable row level security;

-- Drop existing select policy if present
do $$
begin
  if exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='bookings' and policyname='bookings_select_guest_or_owner'
  ) then
    drop policy "bookings_select_guest_or_owner" on public.bookings;
  end if;
end;
$$;

-- Recreate select policy without admin override
create policy "bookings_select_guest_or_owner"
  on public.bookings for select to authenticated
  using (
    guest_id = auth.uid()
    or exists (
      select 1 from public.resorts r 
      where r.id = bookings.resort_id and r.owner_id = auth.uid()
    )
  );
