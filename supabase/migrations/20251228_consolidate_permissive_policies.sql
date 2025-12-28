-- Consolidate multiple permissive policies per role/action into single policies
-- This preserves semantics by OR-ing existing USING/WITH CHECK expressions.
-- Targets are derived from Supabase Advisor findings provided.
DO $$
DECLARE tgt RECORD;
DECLARE p RECORD;
DECLARE role_name name;
DECLARE using_expr text;
DECLARE check_expr text;
DECLARE consolidated_using text;
DECLARE consolidated_check text;
DECLARE pol_exists boolean;
DECLARE polnames text[];
DECLARE cmd text;
DECLARE cons_name text;
DECLARE allow_check boolean;
BEGIN
  -- Define consolidation targets: table + command + policies to merge
  FOR tgt IN
    SELECT * FROM (
      VALUES
        ('public','bookings','DELETE', ARRAY['bookings_delete_guest','bookings_delete_owner','guest can delete past or rejected']::text[]),
        ('public','bookings','SELECT', ARRAY['Anyone can view booking dates for availability','bookings_select_guest_or_owner']::text[]),
        ('public','chat_messages','UPDATE', ARRAY['chat_messages_self_update','participants can mark read']::text[]),
        ('public','chat_typing','SELECT', ARRAY['participants can view typing','users can update own typing']::text[]),
        ('public','moderation_actions','SELECT', ARRAY['moderation_actions_admin_select','moderation_actions_reporter_select']::text[]),
        ('public','notifications','SELECT', ARRAY['notifications_admin_read','notifications_owner_read','notifications_select_own']::text[]),
        ('public','reports','SELECT', ARRAY['reports_select_admin','reports_select_self']::text[]),
        ('public','user_presence','SELECT', ARRAY['anyone can view presence','users can update own presence']::text[])
    ) AS t(schemaname, tablename, cmd, polnames)
  LOOP
    polnames := tgt.polnames;
    cmd := tgt.cmd;
    allow_check := upper(cmd) IN ('INSERT','UPDATE');

    -- Build a per-role consolidation by inspecting existing policies' roles and expressions
    FOR role_name IN
      SELECT DISTINCT unnest(pp.roles) AS role
      FROM pg_policies pp
      WHERE pp.schemaname = tgt.schemaname
        AND pp.tablename = tgt.tablename
        AND pp.policyname = ANY (tgt.polnames::name[])
    LOOP
      -- Aggregate USING expressions
      SELECT string_agg(expr, ' OR ' ORDER BY expr) INTO consolidated_using
      FROM (
        SELECT DISTINCT
          regexp_replace(pp.qual, 'auth\\.uid\\(\\)', '(SELECT auth.uid())', 'g')
        FROM pg_policies pp
        WHERE pp.schemaname = tgt.schemaname
          AND pp.tablename = tgt.tablename
          AND pp.policyname = ANY (tgt.polnames::name[])
          AND pp.roles @> ARRAY[role_name]::name[]
          AND pp.qual IS NOT NULL
      ) s(expr);

      -- Aggregate WITH CHECK expressions (for INSERT/UPDATE)
      SELECT string_agg(expr, ' OR ' ORDER BY expr) INTO consolidated_check
      FROM (
        SELECT DISTINCT
          regexp_replace(pp.with_check, 'auth\\.uid\\(\\)', '(SELECT auth.uid())', 'g')
        FROM pg_policies pp
        WHERE pp.schemaname = tgt.schemaname
          AND pp.tablename = tgt.tablename
          AND pp.policyname = ANY (tgt.polnames::name[])
          AND pp.roles @> ARRAY[role_name]::name[]
          AND pp.with_check IS NOT NULL
      ) s(expr);

      -- Policy name: cons_{table}_{role}_{cmd}
      cons_name := format('cons_%s_%s_%s', tgt.tablename, role_name, lower(cmd));

      -- Drop existing consolidated policy if present to avoid conflicts
      SELECT EXISTS(
        SELECT 1 FROM pg_policies
        WHERE schemaname = tgt.schemaname
          AND tablename = tgt.tablename
          AND policyname = cons_name
      ) INTO pol_exists;
      IF pol_exists THEN
        EXECUTE format('DROP POLICY %I ON %I.%I', cons_name, tgt.schemaname, tgt.tablename);
      END IF;

      -- Create consolidated policy for this role
      IF consolidated_using IS NOT NULL THEN
        IF allow_check AND consolidated_check IS NOT NULL THEN
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %I USING (%s) WITH CHECK (%s)',
            cons_name, tgt.schemaname, tgt.tablename, cmd, role_name, consolidated_using, consolidated_check
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %I USING (%s)',
            cons_name, tgt.schemaname, tgt.tablename, cmd, role_name, consolidated_using
          );
        END IF;
      ELSIF allow_check AND consolidated_check IS NOT NULL THEN
        -- Rare case: only WITH CHECK exists and only valid for INSERT/UPDATE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %I WITH CHECK (%s)',
          cons_name, tgt.schemaname, tgt.tablename, cmd, role_name, consolidated_check
        );
      ELSE
        -- Nothing to consolidate for this role/action
        CONTINUE;
      END IF;
    END LOOP;

    -- Drop original policies now that consolidated ones exist
    FOR p IN
      SELECT * FROM pg_policies
      WHERE schemaname = tgt.schemaname
        AND tablename = tgt.tablename
        AND policyname = ANY (tgt.polnames::name[])
    LOOP
      EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END LOOP;
  END LOOP;
END $$;
