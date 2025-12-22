-- Enable realtime for chat_messages table
-- This ensures messages appear instantly without page refresh

-- Add chat_messages to realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Also ensure message_reactions is in realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMENT ON TABLE public.chat_messages IS 'Chat messages with realtime enabled for instant updates';
