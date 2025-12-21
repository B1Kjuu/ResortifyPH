  -- Migration: update profile sync triggers to include phone, bio, location
  begin;

  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    insert into public.profiles (id, email, full_name, role, created_at, phone, bio, location)
    values (
      new.id,
      new.email,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
      coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'guest'),
      coalesce(new.created_at, now()),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      nullif(new.raw_user_meta_data ->> 'bio', ''),
      nullif(new.raw_user_meta_data ->> 'location', '')
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        role = coalesce(nullif(excluded.role, ''), public.profiles.role),
        phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
        bio = coalesce(nullif(excluded.bio, ''), public.profiles.bio),
        location = coalesce(nullif(excluded.location, ''), public.profiles.location);

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
        role = coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), role),
        phone = coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), phone),
        bio = coalesce(nullif(new.raw_user_meta_data ->> 'bio', ''), bio),
        location = coalesce(nullif(new.raw_user_meta_data ->> 'location', ''), location)
    where id = new.id;

    return new;
  end;
  $$;

  -- Recreate triggers to ensure functions are applied
  DROP TRIGGER IF EXISTS on_auth_users_created ON auth.users;
  CREATE TRIGGER on_auth_users_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  DROP TRIGGER IF EXISTS on_auth_users_updated ON auth.users;
  CREATE TRIGGER on_auth_users_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_user();

  commit;
