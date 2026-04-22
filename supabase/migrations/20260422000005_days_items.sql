-- Helper: user is owner or editor on a trip
create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id
    and user_id = auth.uid()
    and role in ('owner', 'editor')
  );
$$ language sql security definer stable;

-- ── Days ────────────────────────────────────────────────────────
create table public.days (
  id         uuid default gen_random_uuid() primary key,
  trip_id    uuid references public.trips(id) on delete cascade not null,
  date       date not null,
  day_number integer not null,
  notes      text,
  unique (trip_id, date)
);

alter table public.days enable row level security;

create policy "days: read if trip member"
  on public.days for select
  using (public.is_trip_member(trip_id));

create policy "days: insert if editor"
  on public.days for insert
  with check (public.can_edit_trip(trip_id));

create policy "days: update if editor"
  on public.days for update
  using (public.can_edit_trip(trip_id));

create policy "days: delete if owner"
  on public.days for delete
  using (public.is_trip_owner(trip_id));

-- ── Items ───────────────────────────────────────────────────────
create table public.items (
  id                  uuid default gen_random_uuid() primary key,
  trip_id             uuid references public.trips(id) on delete cascade not null,
  day_id              uuid references public.days(id) on delete cascade not null,
  title               text not null,
  item_type           text not null default 'other'
                        check (item_type in ('flight','lodging','transport','activity','meal','other')),
  start_time          timestamptz,
  end_time            timestamptz,
  location_name       text,
  location_lat        double precision,
  location_lng        double precision,
  address             text,
  url                 text,
  notes               text,
  cost_amount         numeric,
  cost_currency       text default 'USD',
  paid_by_user_id     uuid references public.users(id),
  is_proposal         boolean default false not null,
  order_index         integer not null default 0,
  created_by_user_id  uuid references public.users(id) not null,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

create trigger items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create index items_day_id_idx   on public.items(day_id);
create index items_trip_id_idx  on public.items(trip_id);
create index days_trip_id_idx   on public.days(trip_id);

alter table public.items enable row level security;

create policy "items: read if trip member"
  on public.items for select
  using (public.is_trip_member(trip_id));

create policy "items: insert if editor"
  on public.items for insert
  with check (
    public.can_edit_trip(trip_id)
    and auth.uid() = created_by_user_id
  );

create policy "items: update if editor"
  on public.items for update
  using (public.can_edit_trip(trip_id));

create policy "items: delete if editor"
  on public.items for delete
  using (public.can_edit_trip(trip_id));
