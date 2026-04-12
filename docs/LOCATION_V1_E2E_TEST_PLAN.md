# LOCATION V1 - Plan de tests E2E multi-roles

## Objectif

Verifier les flux location sans regression auth/redirection sur les roles critiques:
- client
- partenaire / rental_owner
- admin / super_admin

## Prerequis

- Migration `202604120003_location_v1.sql` appliquee
- Comptes tests actifs (`/comptes-test`)
- Au moins une offre location validee admin

## Scenarios E2E

1. **Auth et redirection role client**
   - Connexion compte test client
   - Redirection vers `/compte` (pas de boucle)
   - Navigation vers `/location`, detail, reservation

2. **Parcours client location**
   - Ouvrir `/location`
   - Filtrer par ville/marque
   - Ouvrir `/location/[id]`
   - Reserver sur `/location/reserver?listing=...`
   - Verifier presence de la reservation dans `/compte/locations`

3. **Parcours partenaire / loueur**
   - Connexion compte test partenaire ou rental_owner
   - Redirection vers `/partenaire`
   - Publication vehicule sur `/partenaire/location/vehicules`
   - Verification etat `pending_review`
   - Consultation reservations sur `/partenaire/location/reservations`

4. **Parcours admin moderation**
   - Connexion compte test admin/super_admin
   - Aller sur `/admin/vehicules`
   - Valider/rejeter/suspendre une offre
   - Aller sur `/admin/reservations` et verifier lecture des montants

5. **Non-regression auth multi-comptes**
   - Enchaîner connexions test: client -> chauffeur -> partner -> rental_owner -> admin -> super_admin
   - Verifier absence de loop et de session stale (sortie propre puis entree propre)

## Cas d'erreur a couvrir

- Reservation sans session -> redirection `/connexion?next=...`
- Reservation avec dates invalides -> message erreur local
- Offre introuvable/non active -> blocage reservation
- Donnees conformite incompletes cote publication -> validation formulaire

## Verification RLS

- Client ne voit que ses reservations location
- Proprietaire/partenaire voit ses offres et reservations liees
- Admin voit tout pour moderation
- Listings `active` visibles au catalogue public
