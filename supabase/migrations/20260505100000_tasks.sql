-- Main task board table (matches `src/lib/tasksApi.js`).

CREATE TABLE IF NOT EXISTS public."Tasks" (
  id BIGSERIAL PRIMARY KEY,
  "Task" TEXT NOT NULL DEFAULT '',
  "Description" TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS tasks_email_lower_idx ON public."Tasks" (lower(trim(email)));

-- JWT app_metadata.admin / role — mirrors `src/lib/adminAuth.js` (VITE_ADMIN_EMAILS is client-only).
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false)
    OR COALESCE(lower(trim(auth.jwt() -> 'app_metadata' ->> 'role')), '')
      IN ('admin', 'super-admin');
$$;

ALTER TABLE public."Tasks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks_select_authenticated" ON public."Tasks";
CREATE POLICY "Tasks_select_authenticated"
  ON public."Tasks" FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tasks_insert_own_email" ON public."Tasks";
CREATE POLICY "Tasks_insert_own_email"
  ON public."Tasks" FOR INSERT TO authenticated
  WITH CHECK (lower(trim(email)) = lower(trim(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Tasks_update_owner_or_admin" ON public."Tasks";
CREATE POLICY "Tasks_update_owner_or_admin"
  ON public."Tasks" FOR UPDATE TO authenticated
  USING (
    public.is_app_admin()
    OR lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    public.is_app_admin()
    OR lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
  );
