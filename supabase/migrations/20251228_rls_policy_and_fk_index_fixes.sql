-- Fix RLS initplan warnings by wrapping auth/current_setting calls in SELECT for specific policies
DO $$
DECLARE r RECORD;
DECLARE new_qual text;
DECLARE new_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE (schemaname, tablename, policyname) IN (
      ('public','notifications','notifications_update_own'),
      ('public','chat_messages','chat_messages_self_update'),
      ('public','chat_participants','chat_parts_self_update'),
      ('public','moderation_actions','moderation_actions_admin_select'),
      ('public','moderation_actions','moderation_actions_admin_insert'),
      ('public','moderation_actions','moderation_actions_reporter_select'),
      ('public','reviews','reviews_update_author'),
      ('public','reports','reports_update_admin')
    )
  LOOP
    IF r.qual IS NOT NULL THEN
      new_qual := regexp_replace(r.qual, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      new_qual := regexp_replace(new_qual, 'auth\.role\(\)', '(SELECT auth.role())', 'g');
      IF new_qual <> r.qual THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, new_qual);
      END IF;
    END IF;

    IF r.with_check IS NOT NULL THEN
      new_check := regexp_replace(r.with_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      new_check := regexp_replace(new_check, 'auth\.role\(\)', '(SELECT auth.role())', 'g');
      IF new_check <> r.with_check THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, new_check);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Add covering btree indexes for flagged foreign keys (safe if missing)
DO $$ 
DECLARE schema_name text := 'public';
DECLARE t_name text;
DECLARE cols text[];
DECLARE idx_exists boolean;
DECLARE idx_name text;
BEGIN
  -- chat_typing_user_id_fkey
  t_name := 'chat_typing';
  SELECT array_agg(kcu.column_name ORDER BY kcu.ordinal_position) INTO cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
   AND tc.table_name = kcu.table_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = schema_name
    AND tc.table_name   = t_name
    AND tc.constraint_name = 'chat_typing_user_id_fkey';
  IF cols IS NOT NULL THEN
    idx_name := 'idx_' || t_name || '_' || array_to_string(cols, '_');
    SELECT EXISTS(
      SELECT 1 FROM pg_indexes
      WHERE schemaname = schema_name AND tablename = t_name AND (indexname = idx_name OR indexdef ILIKE '%' || cols[1] || '%')
    ) INTO idx_exists;
    IF NOT idx_exists THEN
      EXECUTE format('CREATE INDEX %I ON %I.%I (%s)', idx_name, schema_name, t_name, array_to_string(cols, ', '));
    END IF;
  END IF;

  -- favorites_resort_id_fkey
  t_name := 'favorites';
  SELECT array_agg(kcu.column_name ORDER BY kcu.ordinal_position) INTO cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
   AND tc.table_name = kcu.table_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = schema_name
    AND tc.table_name   = t_name
    AND tc.constraint_name = 'favorites_resort_id_fkey';
  IF cols IS NOT NULL THEN
    idx_name := 'idx_' || t_name || '_' || array_to_string(cols, '_');
    SELECT EXISTS(
      SELECT 1 FROM pg_indexes
      WHERE schemaname = schema_name AND tablename = t_name AND (indexname = idx_name OR indexdef ILIKE '%' || cols[1] || '%')
    ) INTO idx_exists;
    IF NOT idx_exists THEN
      EXECUTE format('CREATE INDEX %I ON %I.%I (%s)', idx_name, schema_name, t_name, array_to_string(cols, ', '));
    END IF;
  END IF;

  -- notifications_actor_id_fkey
  t_name := 'notifications';
  SELECT array_agg(kcu.column_name ORDER BY kcu.ordinal_position) INTO cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
   AND tc.table_name = kcu.table_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = schema_name
    AND tc.table_name   = t_name
    AND tc.constraint_name = 'notifications_actor_id_fkey';
  IF cols IS NOT NULL THEN
    idx_name := 'idx_' || t_name || '_' || array_to_string(cols, '_');
    SELECT EXISTS(
      SELECT 1 FROM pg_indexes
      WHERE schemaname = schema_name AND tablename = t_name AND (indexname = idx_name OR indexdef ILIKE '%' || cols[1] || '%')
    ) INTO idx_exists;
    IF NOT idx_exists THEN
      EXECUTE format('CREATE INDEX %I ON %I.%I (%s)', idx_name, schema_name, t_name, array_to_string(cols, ', '));
    END IF;
  END IF;

  -- reviews_guest_id_fkey
  t_name := 'reviews';
  SELECT array_agg(kcu.column_name ORDER BY kcu.ordinal_position) INTO cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
   AND tc.table_name = kcu.table_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = schema_name
    AND tc.table_name   = t_name
    AND tc.constraint_name = 'reviews_guest_id_fkey';
  IF cols IS NOT NULL THEN
    idx_name := 'idx_' || t_name || '_' || array_to_string(cols, '_');
    SELECT EXISTS(
      SELECT 1 FROM pg_indexes
      WHERE schemaname = schema_name AND tablename = t_name AND (indexname = idx_name OR indexdef ILIKE '%' || cols[1] || '%')
    ) INTO idx_exists;
    IF NOT idx_exists THEN
      EXECUTE format('CREATE INDEX %I ON %I.%I (%s)', idx_name, schema_name, t_name, array_to_string(cols, ', '));
    END IF;
  END IF;
END $$;

-- NOTE: Multiple permissive policies detected by Advisor are left unchanged here.
-- Safer remediation is to consolidate into a single policy per role/action by OR-ing
-- existing conditions. Confirm semantics before proceeding; I can implement on request.