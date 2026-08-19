-- Planning chauffeurs (shifts travail/repos) + dispatch automatique du véhicule et du chauffeur.
-- Approche validée : repos répartis/échelonnés (pas tous le même jour, car les week-ends sont
-- probablement des pics de demande pour un service de transport premium) ; dispatch automatique
-- dès confirmation de paiement, véhicule choisi avant le chauffeur, avec interrupteur business_rules
-- et repli visible côté Ops si aucun véhicule/chauffeur ne correspond.

-- ============================================================
-- Planning chauffeurs
-- ============================================================
create table if not exists public.driver_shifts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  shift_date date not null,
  status text not null default 'travail' check (status in ('travail', 'repos')),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (driver_id, shift_date)
);

create index if not exists driver_shifts_date_idx on public.driver_shifts (shift_date);
create index if not exists driver_shifts_driver_idx on public.driver_shifts (driver_id);

alter table public.driver_shifts enable row level security;

create policy "driver_shifts_select_self_or_staff" on public.driver_shifts
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops', 'rh', 'fleet_manager']::app_role[])
  or exists (select 1 from public.drivers d where d.id = driver_shifts.driver_id and d.user_id = auth.uid())
);

create policy "driver_shifts_write_staff" on public.driver_shifts
for all to authenticated
using (has_any_role(array['super_admin', 'manager', 'ops', 'rh', 'fleet_manager']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'ops', 'rh', 'fleet_manager']::app_role[]));

-- Génération répartie : 2 jours de repos/semaine par chauffeur, décalés selon le rang du
-- chauffeur ET le numéro de semaine (pour que ce ne soit pas toujours les mêmes qui travaillent
-- le week-end). idempotent (ON CONFLICT) : peut être relancé pour régénérer une période.
create or replace function public.generate_driver_roster(p_start_date date, p_weeks integer default 2)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver record;
  v_driver_index integer := 0;
  v_week integer;
  v_day integer;
  v_date date;
  v_rest_day_1 integer;
  v_rest_day_2 integer;
  v_dow integer;
  v_count integer := 0;
begin
  if not has_any_role(array['super_admin', 'manager', 'ops', 'rh', 'fleet_manager']::app_role[]) then
    raise exception 'not_authorized';
  end if;

  if p_weeks < 1 or p_weeks > 8 then
    raise exception 'invalid_weeks_range';
  end if;

  for v_driver in (
    select id from public.drivers
    where status is null or lower(status) not in ('inactive', 'suspendu', 'suspended')
    order by id
  ) loop
    for v_week in 0..(p_weeks - 1) loop
      v_rest_day_1 := (v_driver_index + v_week) % 7;
      v_rest_day_2 := (v_rest_day_1 + 3) % 7;
      for v_day in 0..6 loop
        v_date := p_start_date + ((v_week * 7) + v_day);
        v_dow := extract(dow from v_date)::integer;
        insert into public.driver_shifts (driver_id, shift_date, status)
        values (
          v_driver.id,
          v_date,
          case when v_dow = v_rest_day_1 or v_dow = v_rest_day_2 then 'repos' else 'travail' end
        )
        on conflict (driver_id, shift_date)
        do update set status = excluded.status, updated_at = now();
        v_count := v_count + 1;
      end loop;
    end loop;
    v_driver_index := v_driver_index + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.generate_driver_roster(date, integer) from public, anon, authenticated;
grant execute on function public.generate_driver_roster(date, integer) to authenticated;

-- ============================================================
-- Dispatch automatique : véhicule d'abord (capacité), puis chauffeur planifié/disponible
-- ============================================================
create or replace function public.auto_dispatch_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_buffer_minutes numeric;
  v_min_seats integer;
  v_vehicle record;
  v_driver record;
  v_found boolean := false;
  v_found_vehicle_id uuid;
  v_found_driver_id uuid;
  v_order_exists boolean := false;
  v_order_id uuid;
  v_order_number text;
begin
  -- Appelable par le webhook Wave (clé service_role, sans auth.uid()) et par le staff
  -- opérationnel. Les clients/chauffeurs/partenaires authentifiés ne peuvent pas déclencher
  -- un dispatch arbitraire.
  if auth.uid() is not null and not has_any_role(array['super_admin', 'manager', 'ops']::app_role[]) then
    raise exception 'not_authorized';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;

  select coalesce((value_json #>> '{}')::numeric, 90) into v_buffer_minutes
  from public.business_rules
  where category = 'dispatch' and rule_key = 'conflict_buffer_minutes' and is_active
  limit 1;
  v_buffer_minutes := coalesce(v_buffer_minutes, 90);

  select id into v_order_id from public.service_orders where booking_id = p_booking_id;
  v_order_exists := found;
  if v_order_exists and exists (select 1 from public.dispatch_assignments where service_order_id = v_order_id) then
    return jsonb_build_object('ok', false, 'reason', 'already_dispatched');
  end if;

  v_min_seats := greatest(1, coalesce(v_booking.passengers, 1));

  -- 1) Véhicule : capacité suffisante, disponible, pas de mission qui chevauche l'horaire
  --    (± buffer), la plus petite capacité suffisante en premier (réserve les grands véhicules).
  for v_vehicle in (
    select v.id, v.seats
    from public.vehicles v
    where lower(v.status) in ('available', 'disponible')
      and v.seats >= v_min_seats
      and not exists (
        select 1
        from public.dispatch_assignments da
        join public.service_orders so on so.id = da.service_order_id
        join public.bookings b on b.id = so.booking_id
        where da.vehicle_id = v.id
          and b.id <> p_booking_id
          and b.status not in ('annulee_client', 'annulee_sentrajet', 'terminee', 'remboursee', 'no_show')
          and abs(extract(epoch from (b.pickup_time - v_booking.pickup_time))) < (v_buffer_minutes * 60)
      )
    order by v.seats asc
    limit 5
  ) loop
    -- 2) Chauffeur : disponible, planifié "travail" ce jour-là si un planning existe (sinon on
    --    ne bloque pas — dégradation gracieuse tant que le planning n'est pas généré), et pas
    --    déjà affecté à une mission qui chevauche l'horaire.
    select d.id into v_driver
    from public.drivers d
    where lower(d.status) in ('active', 'available', 'disponible')
      and not exists (
        select 1 from public.driver_shifts ds
        where ds.driver_id = d.id and ds.shift_date = v_booking.pickup_time::date and ds.status = 'repos'
      )
      and not exists (
        select 1
        from public.dispatch_assignments da
        join public.service_orders so on so.id = da.service_order_id
        join public.bookings b on b.id = so.booking_id
        where da.driver_id = d.id
          and b.id <> p_booking_id
          and b.status not in ('annulee_client', 'annulee_sentrajet', 'terminee', 'remboursee', 'no_show')
          and abs(extract(epoch from (b.pickup_time - v_booking.pickup_time))) < (v_buffer_minutes * 60)
      )
    order by random()
    limit 1;

    if found then
      v_found := true;
      v_found_vehicle_id := v_vehicle.id;
      v_found_driver_id := v_driver.id;
      exit;
    end if;
  end loop;

  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'no_match', 'min_seats', v_min_seats);
  end if;

  if not v_order_exists then
    v_order_number := 'SO-' || right(extract(epoch from now())::bigint::text, 8);
    insert into public.service_orders (booking_id, order_number, status)
    values (p_booking_id, v_order_number, 'assigned')
    returning id into v_order_id;
  else
    update public.service_orders set status = 'assigned' where id = v_order_id;
  end if;

  insert into public.dispatch_assignments (service_order_id, driver_id, vehicle_id)
  values (v_order_id, v_found_driver_id, v_found_vehicle_id);

  update public.bookings set status = 'chauffeur_assigne', updated_at = now() where id = p_booking_id;
  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (p_booking_id, v_booking.status, 'chauffeur_assigne', 'Dispatch automatique (véhicule puis chauffeur disponibles)');

  return jsonb_build_object('ok', true, 'vehicle_id', v_found_vehicle_id, 'driver_id', v_found_driver_id);
end;
$$;

revoke all on function public.auto_dispatch_booking(uuid) from public, anon, authenticated;
grant execute on function public.auto_dispatch_booking(uuid) to authenticated, service_role;

-- Interrupteur : activé par défaut, désactivable depuis l'admin sans toucher au code.
insert into public.business_rules (category, rule_key, label, value_json, unit, is_active, notes)
values ('dispatch', 'auto_dispatch_actif', 'Dispatch automatique activé', 'true', null, true,
        'Si actif, un véhicule et un chauffeur sont affectés automatiquement dès confirmation de paiement. Désactiver pour repasser en affectation 100% manuelle.')
on conflict (category, rule_key) do nothing;
