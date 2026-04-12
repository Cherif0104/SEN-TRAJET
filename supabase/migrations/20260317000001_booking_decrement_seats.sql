-- Quand une réservation est créée (confirmée), décrémenter les places disponibles du trajet.
-- Ainsi un trajet avec 4 places et 4 réservations devient "complet" (available_seats = 0).

create or replace function public.on_booking_created_decrement_trip_seats()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.trip_id is not null and new.passengers is not null and new.passengers > 0 then
    update public.trips
    set available_seats = greatest(0, available_seats - new.passengers),
        updated_at = timezone('utc', now())
    where id = new.trip_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booking_decrement_trip_seats on public.bookings;
create trigger trg_booking_decrement_trip_seats
  after insert on public.bookings
  for each row
  execute function public.on_booking_created_decrement_trip_seats();

comment on function public.on_booking_created_decrement_trip_seats() is 'Décrémente trips.available_seats à chaque nouvelle réservation (booking) pour clôturer le trajet quand plus de place.';
