-- Trip members table
create table public.trip_members (
  id        uuid default gen_random_uuid() primary key,
  trip_id   uuid references public.trips(id) on delete cascade not null,
  user_id   uuid references public.users(id) on delete cascade not null,
  role      text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz default now() not null,
  unique (trip_id, user_id)
);

alter table public.trip_members enable row level security;

-- Helper: check if current user is a member of a trip (security definer avoids RLS recursion)
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id
    and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper: check if current user is an owner of a trip
create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id
    and user_id = auth.uid()
    and role = 'owner'
  );
$$ language sql security definer stable;

-- trip_members RLS
create policy "trip_members: read if member"
  on public.trip_members for select
  using (public.is_trip_member(trip_id));

create policy "trip_members: insert as owner or by owner"
  on public.trip_members for insert
  with check (
    (auth.uid() = user_id and role = 'owner')
    or public.is_trip_owner(trip_id)
  );

create policy "trip_members: delete self or by owner"
  on public.trip_members for delete
  using (
    auth.uid() = user_id
    or public.is_trip_owner(trip_id)
  );

-- Now that trip_members exists, add the trips read policy
create policy "trips: read if owner or member"
  on public.trips for select
  using (
    auth.uid() = owner_id
    or public.is_trip_member(id)
  );
