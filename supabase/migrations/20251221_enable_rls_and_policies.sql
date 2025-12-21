-- Security hardening: enable RLS and add core policies
begin;

-- Profiles: only read/update own row
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own'
  ) then
    create policy "profiles_select_own"
      on public.profiles for select to authenticated
      using (id = auth.uid());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_own'
  ) then
    create policy "profiles_update_own"
      on public.profiles for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end;
$$;

-- Resorts: allow public read; only owner can write
alter table public.resorts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='resorts' and policyname='resorts_select_public'
  ) then
    create policy "resorts_select_public"
      on public.resorts for select to public
      using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='resorts' and policyname='resorts_write_owner'
  ) then
    create policy "resorts_write_owner"
      on public.resorts for insert to authenticated
      with check (owner_id = auth.uid());
    create policy "resorts_update_owner"
      on public.resorts for update to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end;
$$;

-- Bookings: guest or resort owner can view; guests can create/update their own
alter table public.bookings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='bookings_select_guest_or_owner'
  ) then
    create policy "bookings_select_guest_or_owner"
      on public.bookings for select to authenticated
      using (
        guest_id = auth.uid()
        or exists (
          select 1 from public.resorts r where r.id = bookings.resort_id and r.owner_id = auth.uid()
        )
        or exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='bookings_insert_guest'
  ) then
    create policy "bookings_insert_guest"
      on public.bookings for insert to authenticated
      with check (guest_id = auth.uid());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='bookings_update_guest'
  ) then
    create policy "bookings_update_guest"
      on public.bookings for update to authenticated
      using (guest_id = auth.uid())
      with check (guest_id = auth.uid());
  end if;
end;
$$;

-- Storage: limit avatar uploads to path prefix of user id
-- This complements the existing 'Authenticated upload avatars' policy.

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Insert avatar own folder'
  ) then
    create policy "Insert avatar own folder"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'avatars'
        and name like (auth.uid()::text || '/%')
      );
  end if;
end;
$$;

commit;
