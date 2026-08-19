-- Autorise le prestataire à lire les paiements liés à ses réservations (contrat direct
-- ou clients de son carnet), nécessaire pour l'indicateur "montant à régler".

create policy "payments_read_partner" on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.bookings b
    join public.partner_contracts pc on pc.id = b.partner_contract_id
    where b.id = payments.booking_id
      and pc.partner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.bookings b
    join public.clients c on c.id = b.client_id
    join public.partner_contracts pc on pc.id = c.referred_by_partner_contract_id
    where b.id = payments.booking_id
      and pc.partner_user_id = auth.uid()
  )
);
