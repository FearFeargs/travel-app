# Architectural Decisions

A running log of significant choices made during this project, and why.

---

## 001 — Stack Selection

**Date:** 2026-04-21
**Status:** Decided

### Decision

Use Vite + React, Tailwind CSS, shadcn/ui, Supabase, and Mapbox.

### Reasoning

**Vite + React** is the most widely documented beginner-to-production path for frontend apps. Vite's dev server is nearly instant, and React has the largest ecosystem of learning resources.

**Tailwind CSS** keeps styles in one place (the JSX file) rather than jumping between a component and a separate stylesheet. This trades some verbosity for locality, which helps when reading and editing components.

**shadcn/ui** gives us pre-built, accessible components (modals, dropdowns, buttons) that live in our own codebase rather than inside a black-box library. We can read and edit them directly.

**Supabase** replaces what would otherwise be a Node/Express backend + auth system + database setup. For a first project, starting with a managed backend means we can focus on product features. It uses standard Postgres, so nothing learned is vendor-specific. Realtime subscriptions are built in, which is essential for collaborative features.

**Mapbox** is the leading choice for customizable, embeddable maps with good geocoding APIs. Deferred until core trip planning is working.

### Trade-offs

- Supabase introduces a dependency on a hosted service; if we ever need to self-host everything, migration is possible but requires work.
- shadcn/ui components require being copied into the project — more files to manage, but more control.
- JavaScript (not TypeScript) keeps the learning curve lower now; adding TypeScript later is straightforward.

---

## 002 — Auth, Database Foundation, and First UI

**Date:** 2026-04-21
**Status:** Decided

### What we built

**Database tables:** `users` and `trips` in Supabase, with Row Level Security (RLS) policies enforcing that users can only read/edit their own profile, and only trip owners can read, edit, or delete their trips. The `trips` table has an `updated_at` trigger that automatically timestamps changes.

**Auth flow:** Email/password sign-up and login using Supabase Auth. Three pages — `/signup`, `/login`, `/dashboard` — with React Router handling navigation. A `ProtectedRoute` component redirects unauthenticated users away from `/dashboard`. Logged-in users are redirected away from `/login` and `/signup`.

**Profile creation via database trigger:** When a new user signs up, a Postgres trigger (`on_auth_user_created`) automatically creates their row in the `users` table. The display name is passed as metadata in the `signUp()` call and read by the trigger.

### Why a trigger instead of inserting from the app

Our first attempt inserted the profile row directly from `SignUp.jsx` after `auth.signUp()` returned. This failed because Supabase had email confirmation enabled — the user wasn't fully authenticated yet, so `auth.uid()` was null and RLS blocked the insert. Moving the insert to a database trigger (marked `security definer`) means it runs with elevated privileges the moment the auth user is created, regardless of confirmation status.

### Trade-offs and things deferred

- **Email confirmation is disabled** in the Supabase dashboard for development convenience. Before launch, it should be re-enabled and the sign-up flow updated to show a "check your email" message instead of immediately redirecting.
- **The trips read policy is owner-only for now.** It needs to be updated to also allow trip members to read trips once the `trip_members` table is created.
- **No form validation beyond browser defaults.** Password strength requirements, duplicate email messaging, and field-level errors are all deferred.
- **Dashboard is a placeholder.** It shows the user's name and an empty state message. Actual trip listing comes next.
- **No password reset flow.** Supabase supports this out of the box; we just haven't wired it up yet.

---
