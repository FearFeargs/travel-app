-- ── Expenses ────────────────────────────────────────────────────
create table public.expenses (
  id                uuid default gen_random_uuid() primary key,
  trip_id           uuid references public.trips(id) on delete cascade not null,
  item_id           uuid references public.items(id) on delete set null,
  description       text not null,
  amount            numeric not null,
  currency          text default 'USD' not null,
  paid_by_user_id   uuid references public.users(id) not null,
  expense_date      date not null default current_date,
  notes             text,
  created_at        timestamptz default now() not null
);

alter table public.expenses enable row level security;

create policy "expenses: read if trip member"
  on public.expenses for select
  using (public.is_trip_member(trip_id));

create policy "expenses: insert if editor"
  on public.expenses for insert
  with check (
    public.can_edit_trip(trip_id)
    and auth.uid() = paid_by_user_id
  );

create policy "expenses: update if editor"
  on public.expenses for update
  using (public.can_edit_trip(trip_id));

create policy "expenses: delete if editor"
  on public.expenses for delete
  using (public.can_edit_trip(trip_id));

-- ── Expense splits ───────────────────────────────────────────────
create table public.expense_splits (
  id            uuid default gen_random_uuid() primary key,
  expense_id    uuid references public.expenses(id) on delete cascade not null,
  user_id       uuid references public.users(id) not null,
  share_amount  numeric not null,
  unique (expense_id, user_id)
);

alter table public.expense_splits enable row level security;

create policy "expense_splits: read if trip member"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
      and public.is_trip_member(e.trip_id)
    )
  );

create policy "expense_splits: insert if editor"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
      and public.can_edit_trip(e.trip_id)
    )
  );

create policy "expense_splits: delete if editor"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
      and public.can_edit_trip(e.trip_id)
    )
  );

create index expenses_trip_id_idx on public.expenses(trip_id);
create index expense_splits_expense_id_idx on public.expense_splits(expense_id);
