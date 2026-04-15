# QA rapide SEN TRAJET (10 min)

Objectif: valider les parcours critiques sans régression après stabilisation UX.

## Préparation (1 min)

- Ouvrir l’application en local.
- Aller sur `/comptes-test`.
- Tester sur mobile viewport + desktop.

## 1) Parcours client (3 min)

### 1.1 Recherche trajet
- Aller sur `/recherche`.
- Vérifier:
  - le formulaire est lisible et actionnable.
  - `départ = destination` bloque avec message explicite.
  - les CTA mobiles en bas sont visibles.
- Lancer une recherche valide (ex: Dakar -> Thiès).
- Vérifier:
  - résultats affichés correctement.
  - filtres fonctionnent.

### 1.2 Demande trajet
- Aller sur `/demande`.
- Vérifier:
  - stepper visible.
  - bouton mobile sticky de publication.
  - récapitulatif live se met à jour.
  - `départ = destination` bloque la soumission.

### 1.3 Réservations et demandes client
- Aller sur `/compte/reservations` et `/compte/demandes`.
- Vérifier:
  - statuts en français + couleurs cohérentes.
  - cartes de synthèse visibles.
  - empty state clair quand pas de données.

## 2) Parcours chauffeur (3 min)

### 2.1 Dashboard chauffeur
- Aller sur `/chauffeur`.
- Vérifier:
  - bloc parcours recommandé visible.
  - actions principales accessibles rapidement.

### 2.2 Nouveau trajet
- Aller sur `/chauffeur/trajet/nouveau`.
- Vérifier:
  - stepper visible.
  - bouton mobile sticky de publication.
  - récapitulatif publication mis à jour.
  - `départ = arrivée` bloque la soumission.

### 2.3 Demandes et réservations chauffeur
- Aller sur `/chauffeur/demandes`.
- Vérifier:
  - filtres départ/destination.
  - validation prix (>0) avant envoi proposition.
  - feedback d’erreur/succès cohérent.
- Aller sur `/chauffeur/reservations`.
- Vérifier:
  - statuts harmonisés.
  - action "Marquer terminé" disponible quand pertinent.

## 3) Location (2 min)

### 3.1 Catalogue et réservation location
- Aller sur `/location`.
- Vérifier:
  - filtres catalogue opérationnels.
- Ouvrir un détail `/location/[id]`.
- Réserver via `/location/reserver`.

### 3.2 Suivi location client
- Aller sur `/compte/locations`.
- Vérifier:
  - statuts harmonisés.
  - dates affichées en format FR lisible.

## 4) Contrôle rôle/redirection (1 min)

- Enchaîner connexions comptes test:
  - client -> chauffeur -> partenaire -> admin -> super_admin -> loueur
- Vérifier:
  - redirection vers le bon hub.
  - absence de boucle de connexion.

## Critères de validation finale

- Aucun blocage fonctionnel sur parcours client/chauffeur/location.
- Aucune incohérence majeure de statuts/labels UX.
- Pas de loop auth/redirection.
- Build et lint OK.

## Template de remontée bug (copier-coller)

- Parcours:
- Étape:
- Résultat attendu:
- Résultat observé:
- Capture:
- Gravité: Critique / Majeure / Mineure
