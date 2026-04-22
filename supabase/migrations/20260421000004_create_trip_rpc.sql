-- RPC: create a trip and add the owner to trip_members atomically
create or replace function public.create_trip(
  p_title text,
  p_destination_summary text,
  p_start_date date,
  p_end_date date,
  p_description text default null
)
returns uuid as $$
declare
  v_trip_id uuid;
begin
  insert into public.trips (owner_id, title, destination_summary, start_date, end_date, description)
  values (auth.uid(), p_title, p_destination_summary, p_start_date, p_end_date, p_description)
  returning id into v_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'owner');

  return v_trip_id;
end;
$$ language plpgsql;
