# CADRAGE OPERATIONNEL - Location, Colis, Flotte Chauffeurs

Ce document formalise une version exploitable produit + operations pour SEN TRAJET, alignee avec une logique mobile-first, simple, compacte et accessible.

## 1) Categories vehicules et capacite passagers

- `Citadine`: 4 places passagers (hors chauffeur). Usage ville et trajets courts.
- `SUV / Berline`: 4 a 6 places passagers. Usage confort urbain et interurbain.
- `Familiale`: 5 a 7 places passagers. Usage familles et moyens trajets.
- `Minivan`: 7 a 15 places passagers. Usage navette et groupes.
- `Minibus`: 16 a 30 places passagers. Usage transport collectif organise.
- `Bus`: 30 a 60 places passagers. Usage grandes distances et volume eleve.

Ces categories sont la base commune pour:
- publication de trajets,
- recherche passager,
- envoi colis (vehicule prefere),
- galerie location.

## 2) Classes de service et regles d'eligibilite

### Classe Eco

- Vehicule fonctionnel, propre, securitaire.
- Annee minimale recommandee: 2010.
- Ceintures obligatoirement fonctionnelles.
- Climatisation recommandee, pas obligatoire.
- Pas de defaut de securite critique.

### Classe Confort

- Annee minimale recommandee: 2015.
- Climatisation obligatoire et testee.
- Bon etat interieur et exterieur.
- Entretien prouve (visite/assurance valides).

### Classe Confort Plus

- Annee minimale recommandee: 2018.
- Climatisation performante.
- Etat esthetique soigne, interieur tres propre.
- Qualite de service chauffeur elevee (ponctualite, presentation).

### Classe Premium

- Annee minimale recommandee: 2020.
- Niveau de confort superieur (silence, finition, tenue route).
- Experience client haut de gamme.

### Classe Premium Plus

- Annee minimale recommandee: 2022.
- Vehicule recent et full options.
- Service personnalise type VIP/entreprise.

### Regles transverses obligatoires (toutes classes)

- Carte grise valide.
- Assurance valide.
- Photos reelles du vehicule (interieur + exterieur).
- Verification des ceintures et des points de securite.
- Verification de coherence terrain (si doute ou signalement).

## 3) Fiche synoptique vehicule (signaletique et technique)

Chaque vehicule doit contenir une fiche standard:

- Identification:
  - marque, modele, version,
  - immatriculation,
  - annee,
  - ville.
- Capacite:
  - nombre de places,
  - type de vehicule (citadine, minivan, etc.),
  - classe de service (Eco a Premium Plus).
- Technique:
  - carburant,
  - transmission,
  - kilometrage,
  - climatisation (oui/non + etat),
  - etat ceintures/airbags.
- Conformite:
  - assurance (date),
  - visite technique (date),
  - documents verifies.
- Exploitation:
  - prix par trajet (voyage/colis),
  - prix journalier (location),
  - mode location (avec ou sans chauffeur).

## 4) Modes de location

- `Avec chauffeur`: le client reserve une prestation complete de mobilite.
- `Sans chauffeur`: le client loue le vehicule, avec process de remise/restitution encadre.

Les deux modes partagent:
- validation identite et documents,
- etat des lieux depart/retour,
- traces horodatees.

## 5) Modele economique progressif SEN TRAJET

### Phase 1 - Acquisition (3 mois)

- Inscription chauffeurs gratuite.
- Utilisation gratuite (activation sans friction).
- Objectif: masse critique, habitudes, bouche-a-oreille.

### Phase 2 - Activation progressive

- Abonnement: `5000 FCFA / mois / vehicule`.
- Credits operationnels: publication trajet conditionnee au solde.
- Commission legere par trajet: cible `500 a 1000 FCFA`.
- Activation des frais par paliers apres validation traction marche.

### Principe central

Un meme chauffeur monetise trois canaux:
- transport passagers,
- colis,
- location.

## 6) Badging, notation et confiance

### Badge Chauffeur certifie

- Seuil minimal de trajets realises.
- Note moyenne cible >= 4/5.
- Peu de reclamations graves.
- Avantages: priorisation matching, visibilite renforcee.

### Badge Client certifie

- Historique de comportement positif.
- Fiabilite de paiement et respect des engagements.
- Avantages: priorite support, remises ponctuelles.

### Notation bilaterale

- Le client note le chauffeur.
- Le chauffeur note le client.
- Axes: ponctualite, respect, securite, qualite globale.

## 7) Reclamations et blocage croise

### Types de reclamations

- perte ou dommage colis,
- comportement inapproprie,
- retard majeur,
- probleme vehicule ou securite.

### Workflow minimal

- declaration,
- qualification,
- decision,
- action (compensation, sanction, suspension, blocage).

### Blocage intelligent

- Possibilite de bloquer un couple `client <-> chauffeur`.
- Le moteur de matching doit exclure les couples bloques.

## 8) Instructions techniques de mise en oeuvre

### Donnees

- Standardiser les enums de categories vehicules et classes service.
- Associer chaque listing a:
  - categorie vehicule,
  - classe service,
  - mode location,
  - score conformite.

### Back-office validation

- File de revue des dossiers vehicule.
- Decision explicite: `valide`, `a corriger`, `rejete`.
- Historique des validations et justificatifs.

### Matching multi-service

- Un chauffeur publie une fois et devient visible sur:
  - trajet,
  - colis,
  - location.
- Colis direct: priorite aux trajets compatibles et vehicules adequats.
- Colis depot: route vers point relais/representant.

### UI/UX cible (sans surcharge)

- Mobile-first, cartes compactes, peu de texte.
- Formulaires courts par etapes.
- Boutons clairs et labels simples.
- Etats explicites: en attente, confirme, en cours, termine.

## 9) Check-list qualite pre-production

- RLS active sur toutes les tables sensibles.
- Politiques testees pour `anon` et `authenticated`.
- Verification de non-regression search, reservation, location, colis.
- Temps de completion formulaire mobile < 2 minutes.
- Message d'erreur simple et actionnable pour profils peu alphabetises.
