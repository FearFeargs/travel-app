-- Users profile table (extends Supabase auth.users)
create table public.users (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now() not null
);

alter table public.users enable row level security;

create policy "users: read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users: insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users: update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Trigger: auto-create profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
