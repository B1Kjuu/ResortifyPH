-- Fix chat notification routing based on participant role
-- Previously, all chat notifications linked to /guest/chats regardless of recipient's role
begin;

-- Replace the notify_chat_message function to use role-based routing
create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
as $$
declare
  r record;
  notification_link text;
begin
  for r in
    select cp.user_id, cp.role
    from public.chat_participants cp
    where cp.chat_id = NEW.chat_id
      and cp.user_id <> NEW.sender_id
  loop
    -- Determine correct link based on participant role
    if r.role = 'owner' then
      notification_link := '/owner/chats';
    else
      notification_link := '/guest/chats';
    end if;

    perform public.create_notification(
      r.user_id,
      'chat_message',
      'New message in chat',
      NEW.content,
      notification_link,
      jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id)
    );
  end loop;
  return NEW;
end;
$$;

commit;
