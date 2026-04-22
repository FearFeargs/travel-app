-- Update create_trip to auto-generate day rows for every date in the trip range
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
  v_date    date;
  v_day_num int := 1;
begin
  insert into public.trips (owner_id, title, destination_summary, start_date, end_date, description)
  values (auth.uid(), p_title, p_destination_summary, p_start_date, p_end_date, p_description)
  returning id into v_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'owner');

  v_date := p_start_date;
  while v_date <= p_end_date loop
    insert into public.days (trip_id, date, day_number)
    values (v_trip_id, v_date, v_day_num);
    v_date    := v_date + 1;
    v_day_num := v_day_num + 1;
  end loop;

  return v_trip_id;
end;
$$ language plpgsql;
