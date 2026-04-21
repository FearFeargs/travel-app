# Travel App — Project Documentation

## What This Is

A collaborative travel planning web app. Multiple people can plan trips together in real time.

## Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend framework | Vite + React | Fast dev server, industry-standard UI library |
| Styling | Tailwind CSS | Utility classes keep styles co-located with components |
| UI components | shadcn/ui | Accessible, unstyled-by-default components we own in our codebase |
| Backend | Supabase | Gives us auth, Postgres database, and realtime subscriptions without running a server |
| Maps | Mapbox | Rich map rendering and geocoding (added later) |

## Project Structure

```
src/
  components/   # Reusable UI components
  pages/        # Top-level route components
  lib/          # Supabase client, helpers, utilities
  hooks/        # Custom React hooks
```

## Data Schema

### `users`
Extends Supabase's built-in auth. Created automatically when someone signs up.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Auto-generated, matches Supabase auth user id |
| email | text | |
| display_name | text | |
| avatar_url | text | Optional |
| created_at | timestamp | |

---

### `trips`
The top-level planning object.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| owner_id | uuid | → users.id |
| title | text | e.g. "Baja Spring Break 2027" |
| description | text | Optional |
| start_date | date | |
| end_date | date | |
| destination_summary | text | Free text for v1; structured later |
| cover_image_url | text | Optional |
| is_public | boolean | Controls whether the read-only share link works |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### `trip_members`
Many-to-many join between users and trips.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| trip_id | uuid | → trips.id |
| user_id | uuid | → users.id |
| role | text | `owner`, `editor`, or `viewer` |
| joined_at | timestamp | |

---

### `days`
Each trip has multiple days; days are their own table (not just a date on items) so day-level notes work and shifting entire days is easy.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| trip_id | uuid | → trips.id |
| date | date | Actual calendar date |
| day_number | integer | 1, 2, 3… useful when dates shift |
| notes | text | Free text for day-level notes |

---

### `items`
The actual itinerary entries — flights, lodging, meals, activities, etc.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| trip_id | uuid | → trips.id (redundant with day_id, but simplifies queries) |
| day_id | uuid | → days.id |
| title | text | e.g. "Flight LAX → Cabo" |
| item_type | text | `flight`, `lodging`, `transport`, `activity`, `meal`, `other` |
| start_time | timestamp | |
| end_time | timestamp | Optional |
| location_name | text | e.g. "LAX Terminal 5" |
| location_lat | float | Optional |
| location_lng | float | Optional |
| address | text | Optional |
| url | text | Link to booking/reference, optional |
| notes | text | |
| cost_amount | numeric | |
| cost_currency | text | e.g. `USD`, `MXN` |
| paid_by_user_id | uuid | → users.id |
| is_proposal | boolean | `true` = awaiting group approval before landing on itinerary |
| order_index | integer | Explicit ordering within a day (required for drag-and-drop) |
| created_by_user_id | uuid | → users.id |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### `expenses`
Records actual money spent. Separate from items because real-world spending doesn't always map to the plan — items store the *planned* cost, expenses record the *actual*.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| trip_id | uuid | → trips.id |
| item_id | uuid | Optional → items.id |
| description | text | e.g. "Gas station snacks" |
| amount | numeric | |
| currency | text | |
| paid_by_user_id | uuid | → users.id |
| expense_date | date | |
| created_at | timestamp | |

---

### `expense_splits`
How an expense is divided among trip members. Own table (not embedded) so arbitrary splits work, not just even divisions.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| expense_id | uuid | → expenses.id |
| user_id | uuid | → users.id |
| share_amount | numeric | How much this user owes (e.g. $60 ÷ 3 people = 3 rows of $20) |

---

### `comments`
Per-item or trip-level discussion threads.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| trip_id | uuid | → trips.id |
| item_id | uuid | Optional; `null` = trip-level comment |
| user_id | uuid | → users.id |
| body | text | |
| created_at | timestamp | |

---

### `invites`
Inviting people to a trip before they have an account.

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| trip_id | uuid | → trips.id |
| email | text | |
| invited_by_user_id | uuid | → users.id |
| role | text | `owner`, `editor`, or `viewer` |
| token | text | Unique random string — forms the invite link |
| accepted_at | timestamp | `null` until accepted |
| expires_at | timestamp | |

---

### Key Design Decisions (why the schema looks this way)

- **`days` is its own table** — not just a date field on items — so day-level notes work and shifting all items on a day is a single update.
- **`is_proposal` on items** — lets users suggest additions that appear separately until approved, without needing a second items table.
- **`expenses` separate from `items`** — items hold planned cost; expenses record what was actually spent. They're optionally linked but don't have to be.
- **`expense_splits`** — its own table so you can split $100 unevenly ($60/$25/$15) not just evenly.
- **`order_index` on items** — required for drag-and-drop reordering within a day; timestamps alone don't give a stable order.

## Coding Conventions

- **Language**: JavaScript (not TypeScript) — keep it approachable for a first project
- **Components**: Function components only, no class components
- **Styling**: Tailwind utility classes directly on elements; no separate CSS files unless unavoidable
- **State**: Local `useState`/`useReducer` for UI state; Supabase for server state
- **File naming**: `PascalCase` for components (`TripCard.jsx`), `camelCase` for everything else
- **No premature abstraction**: write the obvious thing first, refactor only when a pattern repeats 3+ times
- **Comments**: only when the *why* is non-obvious — don't narrate what the code does
- **Commits**: short, imperative subject line (`add trip creation form`, not `Added the trip creation form`)

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN=        # added when Mapbox work begins
```

Copy `.env.example` to `.env.local` and fill in values. Never commit `.env.local`.
