# SentraJet — Présentation complète du projet (pour conception de blueprints UI/UX)

> Document à transmettre tel quel pour obtenir des maquettes/blueprints d'écrans détaillés. Il couvre : la vision, l'historique de ce qui a déjà été construit, le modèle économique, les comptes, les services, la logique opérationnelle, la référence visuelle fournie (capture Yango), les écrans attendus et la direction de design. Celui qui reçoit ce document doit produire des blueprints (parcours + écrans détaillés, fidèles à la référence visuelle donnée) destinés à être implémentés tels quels — merci de rester strictement cohérent avec ce qui est décrit ici plutôt que d'inventer un modèle différent.

---

## 1. Présentation du projet

**SentraJet** est une plateforme de transport privée au Sénégal (basée à Dakar), **propriétaire** de son modèle — ce n'est pas une marketplace de mise en relation façon Yango ou Uber où le client choisit un chauffeur dans une liste. Il réserve une **prestation SentraJet** ; c'est SentraJet qui étudie la demande, fixe le tarif, valide, puis affecte en interne un véhicule et un chauffeur de sa propre flotte.

À l'intérieur de cette même plateforme existe une offre complémentaire : **Allo Dakar**, un service de covoiturage interurbain plus économique, opéré par des chauffeurs partenaires indépendants. Allo Dakar doit être présenté comme **une rubrique parmi d'autres** de SentraJet — même en-tête, même pied de page, même identité globale — avec juste une touche de couleur distincte, sans jamais donner l'impression que c'est un autre site.

L'objectif : une expérience aussi fluide, moderne et intuitive qu'une vraie application VTC grand public (Yango, Uber, InDrive) — **l'app ne doit plus ressembler à un site web classique** avec une page d'accueil marketing, mais s'ouvrir directement comme une application mobile (écran de chargement → bienvenue → connexion/inscription → accueil opérationnel).

---

## 2. Historique — ce qui a déjà été construit

Le projet est déjà largement développé, par étapes successives :

1. **Pivot fondateur** : abandon du modèle marketplace initial (chauffeurs indépendants qui acceptent des courses publiées) au profit d'une plateforme propriétaire — flotte et dispatch internes. Rédaction des règles métier de référence (interdits/autorisés).
2. **Socle technique** : design system, écran de démarrage (splash), internationalisation, installation en PWA (icône sur l'écran d'accueil mobile).
3. **Refonte multi-rôles** : un espace dédié par rôle (client, chauffeur, partenaire, propriétaire, et toute l'équipe interne — opérations, commercial, finance, RH, flotte, direction, administration).
4. **Allo Dakar** : création du module (corridors de villes, chauffeurs partenaires indépendants, abonnement + commission 10 %), d'abord séparé visuellement de SentraJet Premium (identité verte distincte, header/footer propres), puis **réintégré** dans la même identité graphique globale sur demande (même en-tête/pied de page que le reste du site, juste une touche de couleur distincte).
5. **Dispatch automatique et planning chauffeurs** : affectation automatique (véhicule d'abord selon la capacité nécessaire, puis chauffeur disponible), génération automatique d'un planning de rotation avec jours de repos.
6. **Outils opérationnels** : calendrier des réservations, notifications, tarifs personnalisés par partenaire, correction et simplification de la tarification (transfert aéroport par catégorie de véhicule — Berline/SUV/Van —, mise à disposition par zone).
7. **Gestion des comptes** : remplacement des suppressions définitives par un archivage réversible (clients, partenaires, utilisateurs internes) pour ne jamais perdre l'historique.
8. **Catalogue de véhicules public** : galerie des véhicules de la flotte avec fiche détaillée par véhicule (galerie photo, caractéristiques, partage).
9. **Extension du catalogue de services** : ajout des cérémonies/sorties, des destinations régionales (toutes les grandes villes desservies), regroupement visuel des rôles internes.
10. **Refonte de l'accueil façon application VTC** : zone de recherche flottante avec détection automatique de la position, grille unifiée de toutes les rubriques de service.
11. **Écran de bienvenue au premier lancement** : logo, message d'accueil, bouton Suivant, puis choix connexion/inscription — affiché une seule fois.
12. **Durcissement sécurité et nettoyage** : suppression de code mort, correction des droits d'accès trop larges sur certaines fonctions internes.
13. **Consolidation** : tout le travail (plus de 20 chantiers livrés en parallèle) a été fusionné sur la branche principale du projet (`main`) — il n'existe plus qu'une seule version de référence, sans fragmentation.

**Ce qui reste à concevoir précisément** (objet de ce document) : l'accueil façon Yango avec la structure exacte demandée (voir section 7), le parcours d'inscription multi-profils affiné, le catalogue de véhicules avec tri/recherche et visionneuse plein écran, et la réflexion sur une séparation éventuelle « SentraJet » (grand public) / « SentraJet Pro » (chauffeurs et loueurs) détaillée en section 4.3.

---

## 3. Les deux offres de la plateforme

| | **SentraJet Premium** | **Allo Dakar** (une rubrique de SentraJet) |
|---|---|---|
| Modèle | Flotte propre, dispatch centralisé par SentraJet | Chauffeurs partenaires indépendants, places en covoiturage |
| Qui fixe le prix | SentraJet (moteur de tarification) | Le chauffeur, par trajet publié |
| Qui choisit le chauffeur | SentraJet (affectation automatique) | Le client réserve une place sur un trajet déjà publié |
| Revenu plateforme | Vente directe de la prestation | Commission (10 %) + abonnement payé par le chauffeur |
| Positionnement | Haut de gamme, fiable | Économique, communautaire |

---

## 4. Les comptes et espaces utilisateurs

### 4.1 Côté client (grand public)

Inscription libre et directe : email ou téléphone, −10 % sur chaque réservation. C'est la seule inscription totalement libre et immédiate.

### 4.2 Côté professionnel (chauffeurs, loueurs)

Sur l'écran d'inscription, en dehors du profil Client, plusieurs profils professionnels doivent être proposés :

- **Chauffeur Allo Dakar** (covoiturage interurbain) — inscription libre, mais soumise à validation : marque et modèle du véhicule, carte grise à soumettre, validation par un responsable d'antenne ou par l'équipe interne avant activation.
- **Taxi aéroport** — chauffeurs dédiés spécifiquement aux transferts AIBD.
- **Loueur de véhicules** — propriétaire qui met un ou plusieurs véhicules à disposition de la plateforme.

Chaque profil professionnel a son propre parcours d'inscription (ses propres informations à fournir) et, une fois validé, son propre espace de travail — strictement cloisonné des autres.

**Devenir partenaire commercial B2B** (hôtel, agence de voyage, conciergerie, entreprise) reste un parcours à part : pas d'inscription automatique, un formulaire de prise de contact, puis étude et certification par l'équipe avant ouverture d'un compte.

**Responsables de groupe de chauffeurs** (« antennes » Allo Dakar) : inscription libre en attente de validation, ou création directe par l'équipe interne — ce sont eux qui valident les chauffeurs qui leur sont rattachés (même visibilité que l'équipe interne sur ces validations).

**Gestionnaires internes** (toutes les casquettes confondues : opérations, commercial, finance, RH, flotte, direction) : créés uniquement par un administrateur, jamais en libre accès.

### 4.3 Piste à trancher : une ou deux applications ?

Idée à l'étude, pas encore décidée : séparer l'expérience en **deux applications distinctes** —

- **SentraJet** : l'application grand public, côté client (réservation, suivi, catalogue de véhicules à parcourir, découverte des services).
- **SentraJet Pro** : l'application dédiée aux professionnels — chauffeurs Allo Dakar, taxis aéroport, loueurs de véhicules — avec leurs propres outils (publication de trajets, gestion de véhicules, missions assignées, etc.).

Si cette séparation est retenue, le document doit être repris en conséquence (deux arborescences d'écrans distinctes). Dans tous les cas, le parcours client grand public (section 7) reste la priorité immédiate.

---

## 5. Catalogue de services

| Service | Logique de prix |
|---|---|
| Transfert aéroport (AIBD) | Forfait par catégorie de véhicule — Berline dès 25 000 F, SUV dès 30 000 F, Van dès 45 000 F, 100 km inclus |
| Mise à disposition | Forfait par zone — 50 000 F Dakar / 60 000 F hors Dakar, pour 8 h |
| Trajet interurbain | Au kilomètre réel, 800 à 1 200 F/km selon véhicule |
| Cérémonies & sorties | Sur devis, type d'événement + nombre de véhicules |
| Location de véhicules | Catalogue à parcourir (voir section 7.3) ; chaque demande reste une prestation classique |
| Destinations régionales | Catalogue de villes, tarif indicatif recalculé à la réservation |
| Allo Dakar | Prix fixé par le chauffeur, à la place, commission 10 % |

Toute demande passe par une **validation interne** avant affectation — jamais automatique dès la saisie.

---

## 6. Logique opérationnelle

**Cycle d'une réservation :** Demande → validation interne → dispatch automatique (véhicule d'abord selon la capacité nécessaire, puis chauffeur disponible pour ce véhicule ; si rien ne correspond, mise en attente + notification de l'équipe, jamais d'échec silencieux) → exécution avec suivi temps réel (position du chauffeur et du client sur une carte, itinéraire recalculé en direct) → clôture.

**Planning chauffeurs/véhicules :** généré automatiquement 1 à 2 semaines à l'avance, 2 jours de repos par semaine par chauffeur (consécutifs ou séparés selon les besoins de couverture), dispatch qui ne propose que les chauffeurs planifiés en service ce jour-là.

---

## 7. Référence visuelle fournie : l'accueil façon Yango

Une capture d'écran de l'application Yango a été fournie comme référence directe pour la page d'accueil souhaitée. Structure exacte observée, à reproduire avec l'identité SentraJet :

1. **Barre du haut** : logo de la marque en haut à gauche, avec juste en dessous le nom de la localité détectée (ex. « Thiès ›») ; une icône de menu (hamburger) en haut à droite.
2. **Rangée de 2 à 3 grandes tuiles de service**, carrées, avec une illustration/photo expressive à l'intérieur (pas une simple icône plate) et un libellé court en dessous (ex. « Moto », « Courses · à partir de 4 min »). Pour SentraJet : **Taxi aéroport**, **Allo Dakar**, **Louer une voiture** — trois rubriques principales, l'utilisateur clique sur celle qui l'intéresse.
3. **Juste en dessous, une barre de recherche large et proéminente** : icône de véhicule à gauche, texte « Où allons-nous ? » centré, flèche à droite pour valider — c'est l'élément le plus visible de l'écran après les tuiles.
4. **Une liste de destinations récentes/suggérées**, chacune avec une case photo à gauche, le nom du lieu, une description courte, et la durée de trajet estimée à droite. Une ligne « Compléter le profil » peut aussi apparaître dans cette liste.
5. **Des bandeaux promotionnels** en bas de l'écran (nouveauté, sécurité, offres en cours) — grandes images avec texte percutant, scrollables verticalement.

**Pour le parcours « Taxi aéroport » depuis cet accueil** : détection automatique de la position de l'utilisateur dès l'ouverture (comme pour Yango qui affiche « Thiès » automatiquement), avec toujours la possibilité de saisir une adresse manuellement si la détection échoue ou si l'utilisateur préfère.

### 7.3 Détail du parcours « Louer une voiture »

1. Clic sur la tuile « Louer une voiture » depuis l'accueil.
2. **Catalogue** de tous les véhicules disponibles — possibilité de trier et de rechercher (par modèle, par catégorie, etc.).
3. Clic sur un véhicule → **fiche détaillée** : galerie de photos que l'on peut faire défiler, avec une option pour les afficher en plein écran.

---

## 8. Autres écrans à concevoir

- **Onboarding** : écran de chargement → logo + message de bienvenue + bouton Suivant → choix connexion/inscription → choix du profil (section 4).
- **Parcours de réservation** (hors accueil) : destination → type de prestation → détails → prix → confirmation → paiement → suivi.
- **Espace client** : réservations (à venir/passées/annulées) avec UI mobile en onglets horizontaux (jamais de boutons empilés verticalement), favoris, profil, déconnexion intégrée au menu profil.
- **Espace chauffeur / professionnel** : missions, historique ; pour Allo Dakar : inscription + suivi de validation + publication de trajets.
- **Back-office gestionnaire** : validation des demandes, création de chauffeurs/véhicules/gestionnaires/antennes, dispatch, planning, tarification.
- **Espace partenaire B2B** : réservation à tarif contractuel, suivi, factures.

---

## 9. Direction visuelle

Inspiration Yango (référence directe fournie, section 7), Uber, InDrive — léger, grandes zones tactiles, illustrations/photos expressives plutôt que texte ou icônes plates. Mobile d'abord pour tout ce qui est client/chauffeur/partenaire. Géolocalisation automatique à l'ouverture. Jamais d'éléments empilés verticalement sur mobile. Une seule identité graphique globale (sauf décision de séparer en deux applications, section 4.3) ; Allo Dakar garde une touche de couleur distincte sans jamais devenir un autre site.

---

## 10. Livrable attendu

Pour chaque écran des sections 7 et 8 : une maquette avec hiérarchie des éléments, états (vide/chargement/erreur), variantes mobile/desktop si pertinent, et le parcours reliant les écrans entre eux. En respectant strictement : le client ne choisit jamais un chauffeur, Allo Dakar reste visuellement intégré, toute réservation passe par une validation avant affectation, et l'accueil doit reproduire fidèlement la structure Yango donnée en référence (section 7) avec l'identité visuelle SentraJet.
