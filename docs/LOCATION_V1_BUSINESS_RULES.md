# LOCATION V1 - Regles business hybrides

## 1) Modes operationnels

- `platform_managed`: le client paie SEN TRAJET, puis SEN TRAJET reverse au proprietaire apres cloture.
- `marketplace_partner`: le client reserve via SEN TRAJET, la plateforme applique commission plateforme + commission partenaire.

## 2) Commissions et credits

- Pourcentage par defaut V1:
  - commission plateforme: `10%`
  - commission partenaire: `4%` (uniquement mode marketplace)
- Source de verite:
  - table `commission_configs` (scope global/partner/region)
  - fallback applique si config absente: `10/4`
- Calcul applique a la reservation location:
  - `subtotal = daily_rate * total_days`
  - `platform_commission = subtotal * platform_percent`
  - `partner_commission = subtotal * partner_percent` (marketplace uniquement)
  - `owner_net = subtotal - platform_commission - partner_commission`
  - `total_client = subtotal + deposit`

## 3) Statuts metier

- Offre location (`rental_listing_status`):
  - `draft` -> `pending_review` -> `active`
  - alternatives: `paused`, `rejected`
- Reservation (`rental_booking_status`):
  - `pending` -> `pending_payment` -> `confirmed` -> `active` -> `completed`
  - alternative: `cancelled`

## 4) Conditions de publication (conformite)

Publication autorisee quand:
- identification complete (plaque, marque, modele, ville, proprietaire)
- securite declaree (airbags, ceintures, roue de secours)
- conformite legale datee (assurance, visite technique)
- exploitation renseignee (km, carburant, moteur, climatisation)

## 5) Reversement proprietaire

- Mode plateforme geree:
  - reversement uniquement sur reservations `completed`
  - net proprietaire stocke en `owner_net_fcfa`
- Mode marketplace:
  - meme logique de cloture, avec separation explicite `platform_commission_fcfa` / `partner_commission_fcfa`

## 6) Audit et tracabilite

- Etats prise/remise via `rental_handover_events` (`pickup`, `return`)
- justificatifs conformite via `rental_vehicle_documents`
- champs financiers figes sur `rental_bookings` pour audit post-transaction
