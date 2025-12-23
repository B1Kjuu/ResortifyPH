-- Get chats for current user with titles and counts
begin;

set local search_path to public;

create or replace function public.get_user_chats()
returns table (
  chat_id uuid,
  booking_id uuid,
  resort_id uuid,
  my_role text,
  other_participant_name text,
  resort_name text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
language plpgsql
security definer
as $$
begin
  return query
  with me as (select auth.uid() as uid)
  select
    c.id as chat_id,
    c.booking_id,
    c.resort_id,
    mep.role as my_role,
    coalesce(p.full_name, p.email, 'User') as other_participant_name,
    r.name as resort_name,
    lm.content as last_message,
    lm.created_at as last_message_at,
    coalesce(uc.unread_count, 0) as unread_count
  from chats c
  join me on true
  join chat_participants mep on mep.chat_id = c.id and mep.user_id = me.uid
  left join chat_participants op on op.chat_id = c.id and op.user_id <> me.uid
  left join profiles p on p.id = op.user_id
  left join bookings b on b.id = c.booking_id
  left join resorts r on r.id = coalesce(c.resort_id, b.resort_id)
  left join lateral (
    select m.content, m.created_at
    from chat_messages m
    where m.chat_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::int as unread_count
    from chat_messages m2
    where m2.chat_id = c.id
      and m2.read_at is null
      and m2.sender_id <> me.uid
  ) uc on true
  order by coalesce(lm.created_at, c.updated_at) desc;
end;
$$;

revoke all on function public.get_user_chats() from public;
grant execute on function public.get_user_chats() to authenticated;

commit;
