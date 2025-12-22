-- Upgrade chat system with attachments, typing indicators, and reactions

-- Add attachment and reaction support to messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Create reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON public.message_reactions(user_id);

-- Create typing status table (ephemeral, for real-time only)
CREATE TABLE IF NOT EXISTS public.chat_typing (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_chat ON public.chat_typing(chat_id);

-- Create presence/online status table
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'message_reactions' AND policyname = 'users can view reactions'
  ) THEN
    CREATE POLICY "users can view reactions"
      ON public.message_reactions FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_participants cp
          INNER JOIN public.chat_messages cm ON cm.chat_id = cp.chat_id
          WHERE cm.id = message_reactions.message_id AND cp.user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'message_reactions' AND policyname = 'users can add reactions'
  ) THEN
    CREATE POLICY "users can add reactions"
      ON public.message_reactions FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'message_reactions' AND policyname = 'users can remove own reactions'
  ) THEN
    CREATE POLICY "users can remove own reactions"
      ON public.message_reactions FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- RLS policies for typing status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_typing' AND policyname = 'participants can view typing'
  ) THEN
    CREATE POLICY "participants can view typing"
      ON public.chat_typing FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_participants cp
          WHERE cp.chat_id = chat_typing.chat_id AND cp.user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_typing' AND policyname = 'users can update own typing'
  ) THEN
    CREATE POLICY "users can update own typing"
      ON public.chat_typing FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- RLS policies for presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_presence' AND policyname = 'anyone can view presence'
  ) THEN
    CREATE POLICY "anyone can view presence"
      ON public.user_presence FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_presence' AND policyname = 'users can update own presence'
  ) THEN
    CREATE POLICY "users can update own presence"
      ON public.user_presence FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- Add to realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Function to auto-cleanup old typing statuses
CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
  DELETE FROM public.chat_typing
  WHERE updated_at < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.message_reactions IS 'Emoji reactions to messages';
COMMENT ON TABLE public.chat_typing IS 'Real-time typing indicators (auto-cleanup after 10s)';
COMMENT ON TABLE public.user_presence IS 'User online/offline status';
