# SentraJet Premium — Frontend Platform

Prototype front-end de la plateforme SentraJet Premium, conçu comme une refonte complète d’une architecture type Yango mais centrée sur le modèle propriétaire SentraJet.

## Espaces
- Direction / Admin
- Client
- Chauffeur
- Partenaire B2B

## Modules du front
- Dashboard / cockpit
- Réservations
- Dispatch / affectation chauffeur
- Chauffeurs
- Clients
- Partenaires
- Flotte
- Tarification paramétrable
- Rapports
- Paramètres
- Profil
- Création de réservation

## Tarification de démonstration intégrée
### Client direct
- AIBD 1–2 : 25 000 FCFA
- AIBD 3–5 : 30 000 FCFA
- AIBD 6–8 : 40 000 FCFA
- AIBD 9–11 : 50 000 FCFA
- Interurbain > 50 km : 850 FCFA/km

### Partenaire B2B validé
- AIBD 1–2 : 20 000 FCFA
- AIBD 3–5 : 25 000 FCFA
- AIBD 6–8 : 30 000 FCFA
- AIBD 9–11 : 40 000 FCFA
- Interurbain > 50 km : 700 FCFA/km

Ces règles sont exposées dans le front comme des données de démonstration et devront être déplacées vers Supabase / un moteur de règles avant production.

## Supabase
Le fichier `config.js` contient les deux variables à renseigner :
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Le client Supabase est chargé via CDN. L’application reste utilisable en mode démo si les variables sont vides.

## Étape suivante
Brancher les écrans sur les tables Supabase existantes (auth, profiles, reservations, drivers, vehicles, partners, pricing_rules, payments, etc.) et remplacer les données de démonstration par les requêtes réelles.
