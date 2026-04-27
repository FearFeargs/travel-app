create table public.comments (
  id         uuid default gen_random_uuid() primary key,
  trip_id    uuid references public.trips(id) on delete cascade not null,
  item_id    uuid references public.items(id) on delete cascade,
  user_id    uuid references public.users(id) not null,
  body       text not null,
  created_at timestamptz default now() not null
);

alter table public.comments enable row level security;

create policy "comments: read if trip member"
  on public.comments for select
  using (public.is_trip_member(trip_id));

create policy "comments: insert if trip member"
  on public.comments for insert
  with check (
    public.is_trip_member(trip_id)
    and auth.uid() = user_id
  );

create policy "comments: delete own"
  on public.comments for delete
  using (auth.uid() = user_id);

create index comments_trip_id_idx on public.comments(trip_id);
create index comments_item_id_idx on public.comments(item_id);

-- Allow authenticated users to read other users' display names (needed for comment threads)
create policy "users: read profile if authenticated"
  on public.users for select
  using (auth.uid() is not null);
