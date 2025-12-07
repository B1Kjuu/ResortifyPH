-- Supabase SQL schema for ResortifyPH
-- Run this in Supabase SQL editor to create tables

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('guest','owner')),
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists resorts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text,
  description text,
  location text,
  price int,
  capacity int,
  amenities text[],
  images text[],
  status text check (status in ('pending','approved')) default 'pending',
  created_at timestamp with time zone default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  resort_id uuid references resorts(id) on delete cascade,
  guest_id uuid references profiles(id) on delete cascade,
  date_from date,
  date_to date,
  status text check (status in ('pending','confirmed','rejected')) default 'pending',
  created_at timestamp with time zone default now()
);

-- Indexes for better query performance
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_is_admin on profiles(is_admin);
create index if not exists idx_resorts_owner_id on resorts(owner_id);
create index if not exists idx_resorts_status on resorts(status);
create index if not exists idx_bookings_resort_id on bookings(resort_id);
create index if not exists idx_bookings_guest_id on bookings(guest_id);
create index if not exists idx_bookings_status on bookings(status);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table resorts enable row level security;
alter table bookings enable row level security;

-- RLS Policies for Profiles
-- Users can view their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (for registration)
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- RLS Policies for Resorts
-- Anyone can view approved resorts
create policy "Anyone can view approved resorts"
  on resorts for select
  using (status = 'approved' or owner_id = auth.uid());

-- Owners can insert their own resorts
create policy "Owners can insert own resorts"
  on resorts for insert
  with check (auth.uid() = owner_id);

-- Owners can update their own resorts
create policy "Owners can update own resorts"
  on resorts for update
  using (auth.uid() = owner_id);

-- Owners can delete their own resorts
create policy "Owners can delete own resorts"
  on resorts for delete
  using (auth.uid() = owner_id);

-- RLS Policies for Bookings
-- Users can view their own bookings (as guest)
create policy "Guests can view own bookings"
  on bookings for select
  using (auth.uid() = guest_id);

-- Resort owners can view bookings for their resorts
create policy "Owners can view bookings for their resorts"
  on bookings for select
  using (
    exists (
      select 1 from resorts
      where resorts.id = bookings.resort_id
      and resorts.owner_id = auth.uid()
    )
  );

-- Guests can create bookings
create policy "Guests can create bookings"
  on bookings for insert
  with check (auth.uid() = guest_id);

-- Guests can update their own bookings (e.g., cancel)
create policy "Guests can update own bookings"
  on bookings for update
  using (auth.uid() = guest_id);

-- Resort owners can update bookings for their resorts (e.g., confirm/reject)
create policy "Owners can update bookings for their resorts"
  on bookings for update
  using (
    exists (
      select 1 from resorts
      where resorts.id = bookings.resort_id
      and resorts.owner_id = auth.uid()
    )
  );

-- Note: Admin users with the is_admin flag can bypass RLS using the service role key
-- Admin operations should be performed through server-side functions or API routes using the service role key
