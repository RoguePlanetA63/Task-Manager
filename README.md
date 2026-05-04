# Task Manager

A team task board built with React and Supabase: authenticated users manage their own tasks, see others’ active work on a shared board, maintain a **profiles** directory for display names, and optionally use an **Admin** panel for broader task operations. Row Level Security (RLS) enforces access; the UI mirrors those rules for navigation only.

**Repository:** add your GitHub URL here after publishing (e.g. `https://github.com/<you>/task-manager`).

---

## Setup

### Prerequisites

- **Node.js** — current LTS is a safe choice (see [nodejs.org](https://nodejs.org/)).
- A **Supabase** project (database + Auth).

### Environment

1. Copy `.env.example` to `.env.local`.
2. Set:
   - `VITE_SUPABASE_URL` — project URL (e.g. `https://xxxx.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY` — project anon / public key.

Optional, **client-side only** (see [RBAC](#rbac-implementation)):

- `VITE_ADMIN_EMAILS` — comma-separated emails that may open the Admin panel in the UI. This does **not** replace database policies; admins who can bypass task ownership in Postgres must have matching JWT `app_metadata` (below).

### Install and run

```bash
npm install
npm run dev
```

Build and preview production bundle:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

Vitest is included for future tests; run `npx vitest` when you add `*.test.*` files under `src/`.

### Database (Supabase)

Apply migrations in order (they live under `supabase/migrations/`):

1. `20260505100000_tasks.sql` — `Tasks` table + RLS + `is_app_admin()`.
2. `20260505120000_task_log_insertion.sql` — `TaskLog` audit table + RLS.
3. `20260507100000_profiles.sql` — `profiles` + RLS.

**Options:**

- **Supabase CLI:** link the project and run `supabase db push` (or your team’s equivalent workflow).
- **SQL Editor:** run each file’s contents in order in the Supabase dashboard.

### Supabase Auth and admin metadata

Enable the auth providers you need (e.g. email).

For **server-side** admin privileges on tasks (RLS), set user **`app_metadata`** in Supabase (Auth → user → raw app meta, or Admin API), aligned with:

- [`src/lib/adminAuth.js`](src/lib/adminAuth.js) (UI), and  
- `public.is_app_admin()` in [`supabase/migrations/20260505100000_tasks.sql`](supabase/migrations/20260505100000_tasks.sql) (database).

Supported patterns include:

- `admin: true` (boolean in JWT), or  
- `role: "admin"` or `"super-admin"` (string).

The **`VITE_ADMIN_EMAILS`** allowlist is **not** visible to Postgres RLS; use JWT fields for real enforcement.

---

## Tech stack

| Area | Choice |
|------|--------|
| UI | [React](https://react.dev/) 19 |
| Build / dev | [Vite](https://vitejs.dev/) 8 |
| Data & auth | [Supabase](https://supabase.com/) — Postgres, Auth, RLS, PostgREST |
| Client | [`@supabase/supabase-js`](https://github.com/supabase/supabase-js) |
| Quality | ESLint, Vitest, Testing Library |

There is **no separate first-party HTTP API** in this repo. The browser uses the Supabase client with the **anon** key; access control is enforced by **RLS** and the authenticated session.

---

## RBAC implementation

Access is split into **UI gating** (what menus you see) and **database RLS** (what rows you can read or write).

### UI (Admin panel)

[`isAdminSession`](src/lib/adminAuth.js) returns true if any of:

- `session.user.app_metadata.admin === true`
- `session.user.app_metadata.role` is `admin` or `super-admin` (string)
- The user’s email (normalized) appears in `VITE_ADMIN_EMAILS`

Hiding the Admin link is **not** security; it only improves UX. All sensitive operations must still pass RLS.

### Database (RLS)

**Tasks** ([`supabase/migrations/20260505100000_tasks.sql`](supabase/migrations/20260505100000_tasks.sql)):

- **SELECT** — any `authenticated` user (shared board + admin views of deleted rows).
- **INSERT** — `Tasks.email` must match the JWT user’s email (`lower(trim(...))`).
- **UPDATE** — row owner (same email match) **or** `is_app_admin()` derived from JWT `app_metadata` (`admin` flag or `role` in `admin` / `super-admin`).

**Profiles** ([`supabase/migrations/20260507100000_profiles.sql`](supabase/migrations/20260507100000_profiles.sql)):

- **SELECT** — any `authenticated` user (team directory / display names on cards).
- **INSERT / UPDATE** — only the row where `id = auth.uid()`.

**TaskLog** ([`supabase/migrations/20260505120000_task_log_insertion.sql`](supabase/migrations/20260505120000_task_log_insertion.sql)):

- **SELECT** — any `authenticated` user.
- **INSERT** — only when `user_id` (text) equals `auth.uid()::text`.

**Important:** the email allowlist env var does **not** grant admin rights in Postgres. Only JWT `app_metadata` does, via `is_app_admin()`.

---

## Audit logging

| Piece | Role |
|-------|------|
| Table | `public."TaskLog"` — `log_id`, `timestamp`, task `id`, `action`, `user_id` (text), `old_value` / `new_value` (`text[]`) |
| Writer | [`Log_insertion`](src/lib/logInsertion.js) — inserts via PostgREST (no RPC) |
| Call sites | [`tasksApi.js`](src/lib/tasksApi.js) after create, update, soft-delete, restore, and admin variants |

Actions include values such as `create`, `update`, `delete`, `restore`, `admin_update`, `admin_delete`. Title/description snapshots are encoded as lines in the `text[]` columns.

RLS ensures users can only **insert** log rows for themselves; **reads** are allowed for all authenticated users (as used by the Admin audit view).

---

## API integrations

All network data access goes through the **Supabase JavaScript client**:

- Client setup: [`src/lib/supabaseClient.js`](src/lib/supabaseClient.js) (`createClient` with env URL/key).
- **Tasks:** [`src/lib/tasksApi.js`](src/lib/tasksApi.js) — `.from('Tasks')` for CRUD-style operations (including soft delete).
- **Audit log:** [`src/lib/logInsertion.js`](src/lib/logInsertion.js) — `.from('TaskLog')` inserts.
- **Profiles:** [`src/lib/profilesApi.js`](src/lib/profilesApi.js) — `.from('profiles')` for read/upsert.

The session from Supabase Auth is attached to the client; PostgREST evaluates policies as the **`authenticated`** role when a valid JWT is present.

---

## How Cursor was used

This project was developed with **Cursor** as the editor and AI pair-programming environment. Typical uses (edit to match your own workflow):

- **Agent / chat** — scaffolding and iterating on Supabase SQL migrations, RLS policies, and React components (task list, admin panel, profiles).
- **Inline assistance** — refactors, lint fixes, and tracing auth/RLS behavior.
- **Explaining errors** — build failures, Supabase policy errors, and client/server mismatches.

Ongoing work is tracked in **Git**; use `git log --oneline` for a concise history of changes.

### Repository milestones

Recent commits (run `git log --oneline` locally for the full list):

- `c081510` — Initial import: React + Vite task manager, Supabase migrations (`Tasks`, `TaskLog`, `profiles`), README, and `.gitignore` hardening for `.env`.

---

## Publishing to GitHub

If this folder is not yet a Git repository:

```bash
git init
git add .
git commit -m "chore: initial commit"
```

Create a new repository on GitHub (empty, no default README if you want a linear first push), then:

```bash
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Replace the placeholder **Repository** link at the top of this file with your public URL.
