-- Chat notifications using create_notification RPC and realtime publication
begin;

-- Ensure notifications are in realtime publication
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null;
end $$;

-- Function to notify chat participants except sender
create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
as $$
declare
  r record;
begin
  for r in
    select cp.user_id
    from public.chat_participants cp
    where cp.chat_id = NEW.chat_id
      and cp.user_id <> NEW.sender_id
  loop
    perform public.create_notification(
      r.user_id,
      'chat_message',
      'New message in chat',
      NEW.content,
      '/guest/chats',
      jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id)
    );
  end loop;
  return NEW;
end;
$$;

-- Trigger on chat_messages inserts
create trigger trg_notify_chat_message
after insert on public.chat_messages
for each row execute procedure public.notify_chat_message();

commit;
