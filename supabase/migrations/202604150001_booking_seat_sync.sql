-- Synchronisation robuste des places disponibles sur trips
-- - Recalcule les places après insert/update/delete de bookings
-- - Ferme automatiquement le trajet quand il n'y a plus de places
-- - Rouvre automatiquement le trajet si des places se libèrent (annulation)

create or replace function public.sync_trip_available_seats(p_trip_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total_seats integer;
  v_reserved_seats integer;
  v_next_available integer;
  v_current_status public.trip_status;
  v_next_status public.trip_status;
begin
  if p_trip_id is null then
    return;
  end if;

  select total_seats, status
  into v_total_seats, v_current_status
  from public.trips
  where id = p_trip_id
  for update;

  if not found then
    return;
  end if;

  select coalesce(sum(passengers), 0)
  into v_reserved_seats
  from public.bookings
  where trip_id = p_trip_id
    and status in ('pending', 'confirmed');

  v_next_available := greatest(v_total_seats - v_reserved_seats, 0);

  if v_current_status = 'cancelled' then
    v_next_status := 'cancelled';
  elsif v_next_available = 0 then
    v_next_status := 'completed';
  elsif v_current_status = 'completed' then
    v_next_status := 'active';
  else
    v_next_status := v_current_status;
  end if;

  update public.trips
  set available_seats = v_next_available,
      status = v_next_status,
      updated_at = timezone('utc', now())
  where id = p_trip_id;
end;
$$;

create or replace function public.trg_sync_trip_available_seats()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    perform public.sync_trip_available_seats(new.trip_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform public.sync_trip_available_seats(new.trip_id);
    if old.trip_id is distinct from new.trip_id then
      perform public.sync_trip_available_seats(old.trip_id);
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.sync_trip_available_seats(old.trip_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_booking_decrement_trip_seats on public.bookings;
drop function if exists public.on_booking_created_decrement_trip_seats();

drop trigger if exists trg_booking_sync_trip_seats on public.bookings;
create trigger trg_booking_sync_trip_seats
after insert or update or delete on public.bookings
for each row
execute function public.trg_sync_trip_available_seats();

comment on function public.sync_trip_available_seats(uuid) is
'Recalcule trips.available_seats depuis bookings (pending/confirmed) et ajuste l''état actif/complet automatiquement.';
