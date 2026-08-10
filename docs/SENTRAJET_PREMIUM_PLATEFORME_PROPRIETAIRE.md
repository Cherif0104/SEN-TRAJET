# SentraJet Premium — Plateforme propriétaire

Document de référence du **pivot produit**. Remplace le modèle « application type Yango / marketplace de chauffeurs indépendants » par une **plateforme propriétaire** opérée par SentraJet Premium.

---

## 1. Décision produit

**SentraJet Premium** est la société propriétaire de la plateforme. Elle opère :

| Espace | Qui | Objectif |
|--------|-----|----------|
| **Espace client** | Particuliers / voyageurs | Réserver un trajet (ou un envoi) sur la plateforme |
| **Espace partenaire** | Entreprises / structures B2B | Réserver avec **tarifs partenaires** (grilles / remises négociées) |
| **Espace chauffeur / véhicules** | Chauffeurs **de la flotte SentraJet** | Recevoir et exécuter les **missions assignées** |
| **Espace société (admin)** | Équipe SentraJet | Piloter clients, partenaires, flotte, tarifs, **dispatch** |

Ce n’est plus une app où des chauffeurs externes publient librement et où des « partenaires » recrutent des chauffeurs contre commission.

---

## 2. Ce qui change par rapport à l’existant

| Avant (marketplace) | Maintenant (plateforme propriétaire) |
|---------------------|--------------------------------------|
| Chauffeur indépendant publie ses trajets et fixe son prix | Flotte SentraJet ; l’admin **assigne** les courses |
| Partenaire = recruteur de chauffeurs + commissions | Partenaire = **client B2B** qui réserve à tarif négocié |
| Matching / propositions concurrentielles | Catalogue / demande → prise en charge plateforme → dispatch |
| Crédits chauffeur pour publier | Hors modèle flotte propriétaire (legacy à déprécier) |
| Admin surtout stubs + modération location | Cockpit opérationnel : clients, partenaires, chauffeurs, affectations |

Le code marketplace existant (location hybride, matching, commissions recruteur) peut rester en base pendant la transition, mais **ne doit plus guider le produit**.

---

## 3. Parcours cibles (V1 propriétaire)

### 3.1 Client

1. Ouvre la plateforme → saisit départ / arrivée / date.
2. Voit l’offre SentraJet (catégorie véhicule, places, prix catalogue).
3. Réserve et paie (ou paie à bord selon règles).
4. Suit le trajet ; le chauffeur est un chauffeur flotte assigné.

### 3.2 Partenaire (B2B)

1. Dispose d’un compte partenaire validé par SentraJet.
2. Dispose d’un **contrat tarifaire** (remise % et/ou prix fixes par corridor).
3. Réserve pour ses collaborateurs / clients finaux aux **prix partenaires**.
4. Suit ses réservations et facturation — **sans** gérer de chauffeurs ni de commissions de recrutement.

### 3.3 Chauffeur (flotte)

1. Appartient à la plateforme (`employment_type = platform_fleet`).
2. Consulte **Mes missions** (affectations).
3. Accepte / démarre / termine la mission.
4. Ne publie plus librement comme marketplace (sauf mode legacy temporaire).

### 3.4 Admin société

1. Gère clients, partenaires B2B, contrats tarifaires.
2. Gère chauffeurs et véhicules de la flotte.
3. **Dispatch** : affecte une réservation / un trajet à un chauffeur (+ véhicule).
4. Suit KPIs opérationnels et conformité.

---

## 4. Modèle de données (fondations)

Introduit par la migration `202608101400_sentrajet_premium_proprietary_platform.sql` :

- `partners.account_type` : `b2b_client` (défaut cible) | `fleet_recruiter` (legacy) | `rental_operator` (legacy location)
- `partner_pricing_contracts` : grilles / remises B2B
- `profiles.employment_type` : `platform_fleet` | `independent` (legacy)
- `vehicles.ownership` : `platform` | `partner` | `driver`
- `trip_assignments` : dispatch (booking/trip → chauffeur / véhicule)
- `bookings.partner_id`, `pricing_contract_id`, `billed_price_fcfa` : réservation B2B tracée

---

## 5. Priorités d’exécution

1. **Cadrage** (ce document) — verrouiller le langage produit.
2. **Schéma** — contrats B2B + assignments + ownership flotte.
3. **Admin** — listes chauffeurs / partenaires / clients + écran Dispatch.
4. **Espace partenaire** — hub « Réserver » + « Mes réservations » (tarif partenaire).
5. **Espace chauffeur** — « Mes missions » branché sur `trip_assignments`.
6. **Parcours client** — offre flotte / prix catalogue (réduire le matching multi-offreurs).
7. **Dépréciation** — invite chauffeurs, commissions recruteur, crédits publication (feature flags / docs).

---

## 6. Langage à utiliser

- Dire **SentraJet Premium** (plateforme propriétaire).
- Dire **partenaire B2B** (client entreprise à tarifs spéciaux), pas « partenaire recruteur ».
- Dire **chauffeur flotte** / **mission assignée**, pas « chauffeur indépendant qui publie ».
- Dire **espace société / admin**, pas seulement « modération ».

Toute nouvelle feature doit être compatible avec ce modèle. Si un besoin ressemble à Yango / InDrive marketplace, le challenger avant d’implémenter.
