-- Trips table
create table public.trips (
  id                  uuid default gen_random_uuid() primary key,
  owner_id            uuid references public.users(id) on delete cascade not null,
  title               text not null,
  description         text,
  start_date          date,
  end_date            date,
  destination_summary text,
  cover_image_url     text,
  is_public           boolean default false not null,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

-- Trigger: keep updated_at current on every update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

alter table public.trips enable row level security;

-- Read policy updated in migration 000003 once trip_members exists
create policy "trips: insert as owner"
  on public.trips for insert
  with check (auth.uid() = owner_id);

create policy "trips: update if owner"
  on public.trips for update
  using (auth.uid() = owner_id);

create policy "trips: delete if owner"
  on public.trips for delete
  using (auth.uid() = owner_id);
