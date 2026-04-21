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
