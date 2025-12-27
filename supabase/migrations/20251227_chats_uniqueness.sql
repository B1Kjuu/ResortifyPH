-- Ensure chats are not duplicated for bookings and per-creator resort chats
begin;

set local search_path to public;

-- Deduplicate existing chats before adding unique indexes
do $$
begin
  -- 1) Deduplicate booking-based chats (one chat per booking)
  with booking_dupes as (
    select booking_id
    from chats
    where booking_id is not null
    group by booking_id
    having count(*) > 1
  ), booking_rows as (
    select c.id, c.booking_id,
           first_value(c.id) over (partition by c.booking_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join booking_dupes d on d.booking_id = c.booking_id
  )
  update chat_messages m
  set chat_id = br.canonical_id
  from booking_rows br
  where m.chat_id = br.id and br.id <> br.canonical_id;

  with booking_dupes as (
    select booking_id
    from chats
    where booking_id is not null
    group by booking_id
    having count(*) > 1
  ), booking_rows as (
    select c.id, c.booking_id,
           first_value(c.id) over (partition by c.booking_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join booking_dupes d on d.booking_id = c.booking_id
  )
  insert into chat_participants (chat_id, user_id, role, joined_at)
  select br.canonical_id, p.user_id, p.role, p.joined_at
  from chat_participants p
  join booking_rows br on p.chat_id = br.id and br.id <> br.canonical_id
  left join chat_participants ex on ex.chat_id = br.canonical_id and ex.user_id = p.user_id
  where ex.chat_id is null;

  with booking_dupes as (
    select booking_id
    from chats
    where booking_id is not null
    group by booking_id
    having count(*) > 1
  ), booking_rows as (
    select c.id, c.booking_id,
           first_value(c.id) over (partition by c.booking_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join booking_dupes d on d.booking_id = c.booking_id
  )
  delete from chat_participants p using booking_rows br
  where p.chat_id = br.id and br.id <> br.canonical_id;

  with booking_dupes as (
    select booking_id
    from chats
    where booking_id is not null
    group by booking_id
    having count(*) > 1
  ), booking_rows as (
    select c.id, c.booking_id,
           first_value(c.id) over (partition by c.booking_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join booking_dupes d on d.booking_id = c.booking_id
  )
  delete from chats c using booking_rows br
  where c.id = br.id and br.id <> br.canonical_id;

  -- 2) Deduplicate resort+creator chats (one chat per resort per creator)
  with resort_dupes as (
    select resort_id, creator_id
    from chats
    where resort_id is not null and creator_id is not null
    group by resort_id, creator_id
    having count(*) > 1
  ), resort_rows as (
    select c.id, c.resort_id, c.creator_id,
           first_value(c.id) over (partition by c.resort_id, c.creator_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join resort_dupes r on r.resort_id = c.resort_id and r.creator_id = c.creator_id
  )
  update chat_messages m
  set chat_id = rr.canonical_id
  from resort_rows rr
  where m.chat_id = rr.id and rr.id <> rr.canonical_id;

  with resort_dupes as (
    select resort_id, creator_id
    from chats
    where resort_id is not null and creator_id is not null
    group by resort_id, creator_id
    having count(*) > 1
  ), resort_rows as (
    select c.id, c.resort_id, c.creator_id,
           first_value(c.id) over (partition by c.resort_id, c.creator_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join resort_dupes r on r.resort_id = c.resort_id and r.creator_id = c.creator_id
  )
  insert into chat_participants (chat_id, user_id, role, joined_at)
  select rr.canonical_id, p.user_id, p.role, p.joined_at
  from chat_participants p
  join resort_rows rr on p.chat_id = rr.id and rr.id <> rr.canonical_id
  left join chat_participants ex on ex.chat_id = rr.canonical_id and ex.user_id = p.user_id
  where ex.chat_id is null;

  with resort_dupes as (
    select resort_id, creator_id
    from chats
    where resort_id is not null and creator_id is not null
    group by resort_id, creator_id
    having count(*) > 1
  ), resort_rows as (
    select c.id, c.resort_id, c.creator_id,
           first_value(c.id) over (partition by c.resort_id, c.creator_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join resort_dupes r on r.resort_id = c.resort_id and r.creator_id = c.creator_id
  )
  delete from chat_participants p using resort_rows rr
  where p.chat_id = rr.id and rr.id <> rr.canonical_id;

  with resort_dupes as (
    select resort_id, creator_id
    from chats
    where resort_id is not null and creator_id is not null
    group by resort_id, creator_id
    having count(*) > 1
  ), resort_rows as (
    select c.id, c.resort_id, c.creator_id,
           first_value(c.id) over (partition by c.resort_id, c.creator_id order by c.created_at asc nulls last) as canonical_id
    from chats c
    join resort_dupes r on r.resort_id = c.resort_id and r.creator_id = c.creator_id
  )
  delete from chats c using resort_rows rr
  where c.id = rr.id and rr.id <> rr.canonical_id;
end $$;

-- Unique chat per booking
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uniq_chats_booking'
  ) then
    create unique index uniq_chats_booking on chats(booking_id) where booking_id is not null;
  end if;
end $$;

-- Unique chat per user per resort (creator-based)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uniq_chats_resort_creator'
  ) then
    create unique index uniq_chats_resort_creator on chats(resort_id, creator_id) where resort_id is not null;
  end if;
end $$;

commit;
