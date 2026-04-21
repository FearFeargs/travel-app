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

_Paste schema here once confirmed._

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
