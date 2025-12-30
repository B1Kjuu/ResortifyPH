-- Payment Templates: Host owners can save their payment details as templates
create table if not exists payment_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade not null,
  name text not null default 'Default', -- e.g., "GCash", "BPI Bank"
  payment_method text not null, -- 'gcash', 'bank_transfer', 'maya', 'other'
  account_name text not null,
  account_number text not null,
  bank_name text, -- only for bank transfers
  additional_notes text, -- any extra instructions
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Payment Submissions: Guest submits payment proof linked to a booking
create table if not exists payment_submissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade not null,
  chat_id uuid references chats(id) on delete set null,
  submitted_by uuid references profiles(id) on delete cascade not null,
  amount numeric(12, 2) not null,
  payment_method text not null, -- 'gcash', 'bank_transfer', 'maya', 'other'
  reference_number text, -- GCash ref # or bank transaction #
  receipt_url text, -- URL to uploaded receipt image
  notes text,
  status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
  verified_by uuid references profiles(id) on delete set null,
  verified_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add payment_verified column to bookings if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'bookings' and column_name = 'payment_status'
  ) then
    alter table bookings add column payment_status text 
      check (payment_status in ('unpaid', 'pending', 'verified', 'partial')) 
      default 'unpaid';
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'bookings' and column_name = 'total_amount'
  ) then
    alter table bookings add column total_amount numeric(12, 2);
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'bookings' and column_name = 'amount_paid'
  ) then
    alter table bookings add column amount_paid numeric(12, 2) default 0;
  end if;
end $$;

-- Create indexes for faster lookups
create index if not exists idx_payment_templates_owner on payment_templates(owner_id);
create index if not exists idx_payment_submissions_booking on payment_submissions(booking_id);
create index if not exists idx_payment_submissions_status on payment_submissions(status);

-- Ensure only one default template per owner
create unique index if not exists idx_payment_templates_default 
  on payment_templates(owner_id) where is_default = true;

-- RLS Policies
alter table payment_templates enable row level security;
alter table payment_submissions enable row level security;

-- Payment Templates: Owners can manage their own templates
create policy "Owners can view own templates" on payment_templates
  for select using (auth.uid() = owner_id);

create policy "Owners can create templates" on payment_templates
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own templates" on payment_templates
  for update using (auth.uid() = owner_id);

create policy "Owners can delete own templates" on payment_templates
  for delete using (auth.uid() = owner_id);

-- Payment Submissions: 
-- Guests can create and view their own submissions
-- Owners can view/verify submissions for their resort bookings
create policy "Users can view related submissions" on payment_submissions
  for select using (
    auth.uid() = submitted_by 
    or exists (
      select 1 from bookings b 
      join resorts r on b.resort_id = r.id 
      where b.id = payment_submissions.booking_id 
      and r.owner_id = auth.uid()
    )
  );

create policy "Guests can submit payments" on payment_submissions
  for insert with check (auth.uid() = submitted_by);

create policy "Owners can verify submissions" on payment_submissions
  for update using (
    exists (
      select 1 from bookings b 
      join resorts r on b.resort_id = r.id 
      where b.id = payment_submissions.booking_id 
      and r.owner_id = auth.uid()
    )
  );

-- Function to update booking payment status when submission is verified
create or replace function update_booking_payment_status()
returns trigger as $$
begin
  if new.status = 'verified' and old.status != 'verified' then
    -- Update the booking's amount_paid
    update bookings 
    set amount_paid = coalesce(amount_paid, 0) + new.amount,
        payment_status = case 
          when coalesce(amount_paid, 0) + new.amount >= coalesce(total_amount, 0) then 'verified'
          else 'partial'
        end,
        updated_at = now()
    where id = new.booking_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_payment_verified
  after update on payment_submissions
  for each row
  when (new.status = 'verified' and old.status != 'verified')
  execute function update_booking_payment_status();
