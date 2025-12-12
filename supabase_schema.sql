-- Supabase SQL schema for ResortifyPH
-- Run this in Supabase SQL editor to create tables

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text check (role in ('guest','owner')) default 'guest',
  is_admin boolean not null default false,
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
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamp with time zone default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  resort_id uuid references resorts(id) on delete cascade,
  guest_id uuid references profiles(id) on delete cascade,
  date_from date,
  date_to date,
  guest_count int not null default 1,
  status text check (status in ('pending','confirmed','rejected')) default 'pending',
  created_at timestamp with time zone default now()
);
-- Keep profiles table synchronized with Supabase Auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, created_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'guest'),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      role = coalesce(nullif(excluded.role, ''), public.profiles.role);

  return new;
end;
$$;

create or replace function public.handle_updated_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      full_name = coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), full_name),
      role = coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), role)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_users_created on auth.users;
create trigger on_auth_users_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_users_updated on auth.users;
create trigger on_auth_users_updated
  after update on auth.users
  for each row execute function public.handle_updated_user();
