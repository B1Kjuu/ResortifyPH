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

-- Note: Row Level Security (RLS) policies should be configured in Supabase UI
-- Example policies needed:
-- 1. Profiles: Users can read/update their own profile
-- 2. Resorts: Anyone can read approved resorts, owners can manage their own
-- 3. Bookings: Guests can manage their bookings, owners can see bookings for their resorts
