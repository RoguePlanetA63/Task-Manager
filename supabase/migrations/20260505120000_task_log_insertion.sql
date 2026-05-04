-- TaskLog audit table (app inserts via REST; no RPC required).
-- user_id is TEXT (auth UID string) — matches `src/lib/logInsertion.js`.

CREATE TABLE IF NOT EXISTS public."TaskLog" (
  log_id BIGSERIAL PRIMARY KEY,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  id BIGINT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  old_value TEXT[],
  new_value TEXT[]
);

CREATE INDEX IF NOT EXISTS tasklog_id_idx ON public."TaskLog" (id);
CREATE INDEX IF NOT EXISTS tasklog_ts_idx ON public."TaskLog" ("timestamp" DESC);

-- If an older migration created user_id as uuid, align with app (text UID string).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TaskLog'
      AND column_name = 'user_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE public."TaskLog" ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public."Log_insertion"(uuid, bigint, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_insertion(uuid, bigint, text, text, text, text, text);

ALTER TABLE public."TaskLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TaskLog_select_authenticated" ON public."TaskLog";
CREATE POLICY "TaskLog_select_authenticated"
  ON public."TaskLog" FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "TaskLog_insert_own_uid" ON public."TaskLog";
CREATE POLICY "TaskLog_insert_own_uid"
  ON public."TaskLog" FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);
