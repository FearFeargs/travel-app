create table public.invites (
  id                  uuid default gen_random_uuid() primary key,
  trip_id             uuid references public.trips(id) on delete cascade not null,
  email               text not null,
  invited_by_user_id  uuid references public.users(id) not null,
  role                text not null check (role in ('editor', 'viewer')) default 'editor',
  token               text unique not null default encode(gen_random_bytes(24), 'hex'),
  accepted_at         timestamptz,
  expires_at          timestamptz not null default (now() + interval '7 days'),
  created_at          timestamptz default now() not null
);

alter table public.invites enable row level security;

-- Trip owners can see and manage their invites
create policy "invites: select if owner"
  on public.invites for select
  using (public.is_trip_owner(trip_id));

create policy "invites: insert if owner"
  on public.invites for insert
  with check (
    public.is_trip_owner(trip_id)
    and auth.uid() = invited_by_user_id
  );

create policy "invites: delete if owner"
  on public.invites for delete
  using (public.is_trip_owner(trip_id));

create index invites_trip_id_idx on public.invites(trip_id);
create index invites_token_idx   on public.invites(token);

-- Returns invite + trip title for a given token (bypasses RLS for token lookup)
create or replace function public.get_invite(p_token text)
returns json as $$
declare
  v_result json;
begin
  select json_build_object(
    'id',        i.id,
    'trip_id',   i.trip_id,
    'trip_title', t.title,
    'email',     i.email,
    'role',      i.role,
    'expires_at', i.expires_at,
    'accepted_at', i.accepted_at
  ) into v_result
  from public.invites i
  join public.trips t on t.id = i.trip_id
  where i.token = p_token;

  return v_result;
end;
$$ language plpgsql security definer stable;

-- Accepts an invite: adds the calling user to trip_members and marks invite accepted
create or replace function public.accept_invite(p_token text)
returns json as $$
declare
  v_invite public.invites%rowtype;
begin
  select * into v_invite
  from public.invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    return json_build_object('error', 'Invite not found or expired');
  end if;

  -- Upsert so re-accepting is idempotent
  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, auth.uid(), v_invite.role)
  on conflict (trip_id, user_id) do nothing;

  update public.invites
  set accepted_at = now()
  where id = v_invite.id;

  return json_build_object('trip_id', v_invite.trip_id);
end;
$$ language plpgsql security definer;
