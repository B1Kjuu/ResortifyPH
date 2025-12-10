-- Supabase SQL schema for ResortifyPH
-- Run this in Supabase SQL editor to create tables

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('guest','owner')),
  created_at timestamp with time zone default now()
);

create table if not exists resorts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text,
  description text,
  location text,
  type text check (type in ('beach','mountain','nature','city','countryside')) default 'city',
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
