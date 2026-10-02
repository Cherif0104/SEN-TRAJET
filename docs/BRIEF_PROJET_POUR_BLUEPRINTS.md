# SentraJet — Présentation du projet (pour conception de blueprints UI/UX)

> Document de synthèse à transmettre pour obtenir des maquettes/blueprints d'écrans. Il décrit le projet dans sa globalité : vision, modèle économique, comptes, services, logique opérationnelle, écrans attendus et direction visuelle. Celui qui recevra ce document doit produire des blueprints (parcours + écrans détaillés) qui seront ensuite implémentés tels quels — merci de rester cohérent avec tout ce qui est décrit ici plutôt que d'inventer un modèle différent.

---

## 1. Présentation du projet

**SentraJet** est une plateforme de transport privée au Sénégal (basée à Dakar), **propriétaire** de son modèle — ce n'est pas une marketplace de mise en relation façon Yango ou Uber. Le client ne choisit pas un chauffeur dans une liste et ne négocie pas un prix avec plusieurs chauffeurs qui enchérissent. Il réserve une **prestation SentraJet** ; c'est SentraJet qui étudie la demande, fixe le tarif, valide, puis affecte en interne un véhicule et un chauffeur de sa propre flotte.

À l'intérieur de cette même plateforme (une seule application, un seul compte, pas une app séparée), il existe une **deuxième offre complémentaire** : **Allo Dakar**, un service de covoiturage interurbain plus économique, opéré par des chauffeurs partenaires indépendants (pas la flotte propre de SentraJet). Allo Dakar doit être présenté comme **une rubrique parmi d'autres** de SentraJet — même en-tête, même pied de page, même identité globale — avec juste une touche de couleur distincte (vert) pour bien le différencier du reste au niveau du contenu, sans jamais donner l'impression que c'est un autre site ou une autre appli.

L'objectif final : que l'utilisateur ait une expérience aussi fluide, moderne et intuitive qu'une vraie application VTC grand public (Yango, Uber, InDrive), tout en gardant un modèle économique de compagnie de transport privée (pas une marketplace ouverte).

---

## 2. Les deux offres de la plateforme

| | **SentraJet Premium** | **Allo Dakar** (une rubrique de SentraJet) |
|---|---|---|
| Modèle | Flotte propre, dispatch centralisé par SentraJet | Chauffeurs partenaires indépendants, places en covoiturage |
| Qui fixe le prix | SentraJet (moteur de tarification) | Le chauffeur, par trajet publié |
| Qui choisit le chauffeur | SentraJet (affectation automatique) | Le client réserve une place sur un trajet déjà publié |
| Revenu plateforme | Vente directe de la prestation | Commission (10 %) + abonnement payé par le chauffeur pour publier |
| Positionnement | Haut de gamme, fiable, pas de surprise | Économique, communautaire, point à point entre villes |

Les deux doivent être **découvrables depuis les mêmes points d'entrée** (accueil, inscription, connexion) mais rester **deux moteurs de prix et deux logiques d'affectation bien distincts** en coulisses.

---

## 3. Les comptes et espaces utilisateurs

### 3.1 La vision cible (simplifiée) — 4 types de comptes

1. **Client** — réserve une prestation (Premium ou Allo Dakar).
2. **Gestionnaire / Administrateur** — l'équipe interne SentraJet : gère les clients, les partenaires, la flotte, les chauffeurs, la tarification, le dispatch. En interne, ce compte peut avoir des permissions plus ou moins larges (opérations, finance, ressources humaines, flotte, direction) mais le client/chauffeur/partenaire ne voit toujours qu'un **gestionnaire SentraJet**.
3. **Chauffeur** — exécute les courses qui lui sont affectées (flotte Premium) ou publie ses trajets (Allo Dakar, après validation).
4. **Partenaire** — soit un **propriétaire de véhicule** qui met un ou plusieurs véhicules à disposition de la plateforme, soit un **partenaire commercial B2B** (hôtel, agence de voyage, conciergerie, entreprise) qui réserve avec des tarifs négociés propres à son contrat.

### 3.2 Création des comptes

- **Client** : inscription libre, email ou téléphone + code SMS, −10 % sur chaque réservation.
- **Chauffeur** : deux voies — (a) recrutement direct par l'équipe interne (flotte Premium, aucune inscription publique) ou (b) inscription libre pour Allo Dakar (marque et modèle du véhicule, upload de la carte grise), **toujours soumise à validation** avant activation.
- **Partenaire** : jamais d'inscription automatique — passage par un diagnostic commercial, certification, puis création du compte par l'équipe une fois le partenaire validé.
- **Gestionnaires internes** (toutes les casquettes : opérations, commercial, finance, RH, flotte, direction) : créés uniquement par un administrateur depuis le back-office, jamais en libre accès.
- **Responsables de groupe de chauffeurs** (« antennes » Allo Dakar — l'équivalent d'un gestionnaire qui regroupe plusieurs chauffeurs indépendants sous sa responsabilité, avec son propre tableau de bord) : créés soit par inscription libre (en attente de validation), soit directement par l'équipe interne.

### 3.3 Validation des chauffeurs et véhicules

Toute inscription de chauffeur doit fournir : nom, téléphone, marque et modèle du véhicule, numéro et photo de la carte grise. Cette fiche est soumise à validation — par le responsable d'antenne à qui le chauffeur est rattaché, ou par l'équipe interne (administrateur/super-administrateur) qui doit avoir la même visibilité et les mêmes outils de validation que le responsable d'antenne.

---

## 4. Catalogue de services

| Service | Logique de prix | Exemple |
|---|---|---|
| **Transfert aéroport (AIBD)** | Forfait par catégorie de véhicule, km inclus puis tarif au km au-delà | Berline à partir de 25 000 F, SUV à partir de 30 000 F, Van à partir de 45 000 F — 100 km inclus |
| **Mise à disposition** (location avec chauffeur, à l'heure/à la journée) | Forfait par zone, durée incluse | 50 000 F à Dakar / 60 000 F hors Dakar, pour 8 h |
| **Trajet interurbain / voyage** | Tarif au kilomètre réel, selon le nombre de passagers | De 800 à 1 200 F/km selon le véhicule nécessaire |
| **Cérémonies & sorties** (mariage, baptême, cortège) | Sur devis — type d'événement + nombre de véhicules souhaités | Convoi de plusieurs véhicules sur demande |
| **Location de véhicules** | Catalogue de découverte (vitrine), chaque demande passe par une réservation classique | Pas une location libre sans chauffeur — reste une prestation SentraJet |
| **Destinations régionales** | Catalogue de villes desservies avec tarif indicatif, calcul réel à la réservation | Thiès, Saint-Louis, Ziguinchor, Tambacounda… |
| **Allo Dakar (covoiturage)** | Prix fixé par chauffeur, à la place, deux tarifs (point de rendez-vous / porte-à-porte) | Commission plateforme 10 % |

Chaque demande client ou partenaire doit obligatoirement passer par une **validation interne** avant toute affectation — ce n'est jamais automatique dès la saisie.

---

## 5. Logique opérationnelle (le cœur du système)

### 5.1 Cycle de vie d'une réservation

1. **Demande** — client ou partenaire décrit son besoin (ou le gestionnaire la crée pour lui).
2. **Validation interne** — l'équipe SentraJet étudie, chiffre si besoin, confirme.
3. **Déclenchement du dispatch automatique** dès la validation (et le paiement) :
   - Déterminer la **catégorie de véhicule nécessaire** à partir du nombre de passagers et/ou du type de véhicule demandé (nombre de places).
   - Chercher un **véhicule disponible** correspondant à cette catégorie, non déjà affecté à une autre mission qui se chevauche. **On affecte d'abord un véhicule, pas un chauffeur.**
   - Une fois le véhicule trouvé, chercher un **chauffeur disponible** pour ce véhicule à cette date (en tenant compte du planning).
   - Si aucun véhicule ou chauffeur ne correspond : la réservation reste « en attente d'affectation » et l'équipe est notifiée pour une intervention manuelle — jamais d'échec silencieux.
4. **Exécution** — suivi en temps réel : le chauffeur partage sa position, le client suit l'itinéraire sur une carte, jusqu'à la prise en charge puis la fin de course.
5. **Clôture** — facturation, historique, avis.

### 5.2 Planning et rotation des chauffeurs/véhicules

- Un planning est généré automatiquement 1 à 2 semaines à l'avance, chauffeur par chauffeur.
- Règle de base : **2 jours de repos par semaine** par chauffeur, consécutifs ou séparés selon les besoins de couverture (ex. pour toujours avoir du monde le week-end).
- Le dispatch automatique ne doit proposer que les chauffeurs **planifiés en service** ce jour précis — et respecter la même logique de rotation côté véhicules.
- Vue calendrier dédiée pour l'équipe (type RH/Flotte) : chauffeurs en lignes, jours en colonnes, modifiable à la main si besoin.

---

## 6. Expérience attendue et écrans à concevoir

### 6.1 Premier lancement (onboarding)

1. **Écran de démarrage** : logo, message de bienvenue court, bouton « Suivant »/« Démarrer ».
2. **Choix d'accès** : « J'ai déjà un compte » / « Créer un compte », avec toujours une option « Continuer sans compte » (l'app reste utilisable pour parcourir le catalogue et réserver en invité).
3. **Choix du profil à l'inscription** : Client / Chauffeur / Partenaire / Propriétaire de véhicule — chacun est ensuite redirigé vers le parcours qui lui correspond. Chaque profil a sa propre interface, strictement cloisonnée (un loueur ne voit jamais l'espace chauffeur, etc.), mais tout le monde entre par la même application.

### 6.2 Accueil (après connexion, ou pour un visiteur)

Écran principal façon « grille d'app VTC » (Yango/Uber/InDrive) — pas une page marketing classique :
- Une zone de recherche rapide en haut (« Où allez-vous ? », détection automatique de la position).
- Une grille de 4 à 6 tuiles (2 colonnes en mobile, 3 en tablette/desktop), une par offre : Transfert aéroport, Mise à disposition, Interurbain, Cérémonies, Location de véhicules, Destinations, et Allo Dakar bien visible (avec sa touche de couleur distincte). Chaque tuile a une icône ou illustration claire, un intitulé court, un sous-texte, et mène directement au bon point d'entrée.

### 6.3 Parcours de réservation

Départ (détecté automatiquement ou saisi) → destination → type de prestation → détails spécifiques (nombre de passagers, catégorie de véhicule pour l'aéroport, type d'événement pour une cérémonie, etc.) → récapitulatif de prix → confirmation → paiement → suivi.

### 6.4 Espace client

- Mes réservations (à venir / passées / annulées), avec tous les boutons et filtres pensés **mobile d'abord** (jamais de piles de boutons empilés verticalement — préférer des onglets horizontaux ou un design contextualisé en haut de l'écran).
- Favoris, profil, visibilité claire d'un éventuel abonnement en cours.
- Déconnexion intégrée proprement dans le menu de profil (pas un bouton isolé qui traîne).

### 6.5 Marketplace / catalogue de véhicules

- Grille de véhicules avec photo, catégorie, nombre de places.
- Fiche détaillée au clic : galerie photo défilable, toutes les caractéristiques (marque, modèle, année, couleur, bagages), bouton de partage (vers WhatsApp ou autre), bouton de réservation.
- Réflexion à prévoir sur un système de badges (certifié / non certifié, niveaux premium/bronze) attribués par l'équipe SentraJet, avec une possibilité pour le propriétaire du véhicule ou le partenaire d'acheter un badge de mise en avant — modèle de commercialisation à détailler.

### 6.6 Espace chauffeur

- Mission du jour, missions à venir, historique.
- Pour Allo Dakar : formulaire d'inscription (véhicule, carte grise), suivi du statut de validation, publication de trajets une fois validé.

### 6.7 Espace gestionnaire interne (back-office)

- Vue d'ensemble des demandes à valider.
- Création directe de chauffeurs, véhicules, gestionnaires, responsables d'antenne (avec compte de connexion).
- Dispatch (automatique + reprise manuelle en cas d'échec), calendrier des réservations, planning de rotation chauffeurs/véhicules.
- Tarification, règles métier, facturation, rapports.

### 6.8 Espace partenaire

- Réservation avec tarifs propres au contrat, suivi des réservations, factures.

### 6.9 Suivi temps réel

Pendant une course active : carte avec la position du chauffeur et/ou du client, itinéraire et durée estimée recalculés en direct, visible depuis l'espace client et l'espace chauffeur.

---

## 7. Direction visuelle et principes de design

- **Inspiration déclarée** : Yango, Uber, InDrive — légèreté, grandes zones tactiles, iconographie claire, très peu de texte à l'écran, usage de photos/illustrations plutôt que de blocs de texte.
- **Mobile d'abord** pour tous les espaces orientés clients/chauffeurs/partenaires ; le back-office interne peut rester orienté desktop (plus de données, plus d'écran).
- Géolocalisation automatique dès l'ouverture (pas de bouton à chercher), avec repli propre si l'utilisateur refuse.
- Jamais d'éléments d'interface qui s'empilent verticalement sur mobile (listes de boutons, onglets) — toujours une solution horizontale, en grille, ou contextualisée.
- Une seule identité graphique globale pour toute la plateforme ; Allo Dakar garde une touche de couleur distincte mais partage la même structure de navigation (même en-tête, même pied de page).

---

## 8. Ce qui existe déjà (pour ne pas repartir de zéro)

La plateforme est déjà construite et fonctionnelle sur l'essentiel : moteur de tarification par service, réservation client/partenaire, dispatch automatique (véhicule puis chauffeur), planning de rotation (respect des jours de repos), suivi temps réel chauffeur/client, catalogue de véhicules avec fiche détaillée et partage, écran de bienvenue au premier lancement, grille de services façon app VTC sur l'accueil, espace Allo Dakar intégré à la même identité visuelle. Les blueprints demandés doivent donc **affiner et préciser l'existant** (notamment les écrans de détail, les interactions fines, les cas particuliers) plutôt que proposer une refonte totale déconnectée de ce qui tourne déjà.

Points encore ouverts, à concevoir en priorité : le modèle de badges/certification payants, le parcours complet d'inscription d'un propriétaire de véhicule en libre accès, et le détail visuel écran par écran de chaque étape listée en section 6.

---

## 9. Ce qu'on attend comme livrable

Pour chaque écran listé en section 6 : une maquette (wireframe ou blueprint détaillé) avec hiérarchie des éléments, états (vide/chargement/erreur), variantes mobile et desktop si pertinent, et le parcours qui relie les écrans entre eux (quel bouton mène où). Merci de respecter strictement le modèle économique et les règles opérationnelles décrits plus haut — notamment : le client ne choisit jamais un chauffeur, Allo Dakar reste visuellement intégré au reste de la plateforme, et toute réservation passe par une validation avant affectation.
