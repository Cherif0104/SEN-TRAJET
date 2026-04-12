# Execution parallele V1 - SEN TRAJET

## Jalon 1 - Fondations techniques (S1-S2)
- Migration SQL: geo reference, pricing rules, RBAC, compliance, commission config.
- Compatibilite applicative: fallback runtime si migration non appliquee.
- Sortie attendue:
  - recherche et publication continuent de fonctionner;
  - nouvelles colonnes prêtes pour activation progressive.

## Jalon 2 - Parcours metier core (S3-S4)
- Chauffeur:
  - publication trajet avec mode pickup et point chauffeur;
  - prix base + supplement domicile configurable.
- Client:
  - recherche avec option pickup;
  - affichage du prix final selon option choisie.
- Sortie attendue:
  - funnel reservation comprehensible en mobile.

## Jalon 3 - Gouvernance et securite (S5)
- Durcissement middleware RBAC par role.
- Preparation du modele multi-organisation (organizations, user_roles).
- Sortie attendue:
  - zones admin/partenaire/chauffeur isolees par role.

## Jalon 4 - Conformite chauffeur (S6)
- Workflow controle:
  - onboarding KYC;
  - recontrole S+1;
  - recontrole bi-hebdo.
- Affichage chauffeur:
  - planning des controles a venir;
  - statut du dernier controle.

## Jalon 5 - Monétisation et reporting (S7-S8)
- Regles de commission modulables par scope.
- Exposition des regles actives en interface partenaire.
- Preparation dashboards admin (compliance + commissions).

## Dependances critiques
- Les colonnes pickup/pricing dependent de la migration SQL.
- Les controles KYC dependent des tables compliance.
- Les taux dynamiques dependent des tables pricing_rules/commission_configs.

## Risques et mitigation
- **Migration non appliquee**: fallback legacy sur createTrip/createRequest.
- **Qualite geo partielle**: adopter un chargement incremental region par region.
- **Complexite UX**: valider chaque ecran mobile sur scenario principal avant enrichissement.
- **Charge produit**: garder un circuit de validation hebdomadaire (demo + arbitrage).

## Definition of done globale
- Publication chauffeur + recherche client operationnelles avec pickup mode.
- Supplement domicile applique et visible cote client.
- RBAC applique sur les zones privees.
- Suivi KYC disponible dans le profil chauffeur.
- Regle de commission active visible cote partenaire.
