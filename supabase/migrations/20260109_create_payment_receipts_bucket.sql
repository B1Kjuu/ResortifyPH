-- Create payment-receipts storage bucket
-- This bucket stores payment receipt images uploaded by guests

-- Create the bucket (public access for receipt viewing)
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', true)
on conflict (id) do nothing;

-- RLS Policies for payment-receipts bucket

-- Allow authenticated users to upload receipts (guests submitting payment proof)
create policy "Authenticated users can upload payment receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-receipts'
  and auth.uid()::text = (storage.foldername(name))[1] -- User can only upload to their own folder
);

-- Allow users to view receipts for bookings they're involved in
-- (guest who uploaded it, or owner of the resort for that booking)
create policy "Users can view related payment receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    -- User uploaded it (folder name matches their ID)
    auth.uid()::text = (storage.foldername(name))[1]
    or
    -- User is the owner of the resort for this booking
    exists (
      select 1 
      from payment_submissions ps
      join bookings b on ps.booking_id = b.id
      join resorts r on b.resort_id = r.id
      where ps.receipt_url like '%' || name || '%'
      and r.owner_id = auth.uid()
    )
  )
);

-- Allow users to delete their own receipts
create policy "Users can delete own payment receipts"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'payment-receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);
