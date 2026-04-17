-- Renforcement synchronisation places bookings <-> trips
-- Objectifs:
-- 1) Garder available_seats comme source de vérité calculée
-- 2) Eviter de marquer un trajet "completed" uniquement parce qu'il est plein
-- 3) Ajouter des garde-fous sur les passagers

alter table if exists public.bookings
  drop constraint if exists bookings_passengers_positive_chk;

alter table if exists public.bookings
  add constraint bookings_passengers_positive_chk
  check (passengers > 0);

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
  else
    -- Un trajet plein reste actif (non réservable), il n'est pas terminé.
    v_next_status := 'active';
  end if;

  update public.trips
  set available_seats = v_next_available,
      status = v_next_status,
      updated_at = timezone('utc', now())
  where id = p_trip_id;
end;
$$;

comment on function public.sync_trip_available_seats(uuid) is
'Recalcule trips.available_seats depuis bookings (pending/confirmed), sans clôturer automatiquement le trajet quand il est plein.';
