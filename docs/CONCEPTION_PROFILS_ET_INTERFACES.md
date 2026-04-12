# Conception des profils et interfaces par rôle

Document de conception pour une expérience **individuelle**, **moderne** et **optimale** pour chaque type d’utilisateur (Client, Chauffeur, Partenaire). À aligner avec l’existant et les bonnes pratiques (InDrive, BlaBlaCar, marketplaces locales).

---

## 1. Principes généraux

- **Landing vs boarding** : la page d’accueil publique (`/`) s’affiche uniquement pour les **non connectés**. Dès qu’un utilisateur est connecté, une visite sur `/` le redirige vers son **boarding** (espace dédié) : client → `/compte`, chauffeur → `/chauffeur`, partenaire → `/partenaire`. Le lien « Accueil » du header pointe vers ce même espace pour les utilisateurs connectés.
- **Un rôle = un espace dédié** : navigation et contenu adaptés au rôle, sans mélanger les parcours.
- **Accès rapide** : tableau de bord avec résumé (chiffres clés, prochaines actions) et liens directs.
- **Cohérence** : même structure de navigation (sidebar + contenu principal), même langage visuel (cartes, boutons, états).
- **Mobile-first et responsive** : la **majeure partie des utilisateurs sera sur mobile** (notamment au Sénégal). Conception **d’abord pour mobile** (navigation bas de page, contenus lisibles, actions accessibles au pouce, écrans maniables), puis **desktop** sans dégrader le mobile. Interface **moderne et intuitive** — l’expérience utilisateur est prioritaire pour une adoption large.

---

## 2. Client (voyageur / expéditeur)

### 2.1 Objectif

Trouver un trajet ou envoyer un colis, réserver, suivre ses réservations et communiquer avec le chauffeur.

### 2.2 Navigation (header + éventuelle zone compte)

- **Header** (toujours visible) : Accueil, Trajets (recherche), Demander (créer une demande), Messages.
- **Zone compte** : clic sur le nom/avatar → **Mon compte** (hub) avec sous-pages.

### 2.3 Espace « Mon compte » (hub client)

**Route** : `/compte` (layout optionnel avec sidebar ou onglets).

| Élément | Description |
|--------|-------------|
| **Tableau de bord** (`/compte`) | Résumé : prochain trajet (si une réservation à venir), nombre de réservations en cours, lien rapide « Rechercher un trajet », « Publier une demande ». Design : cartes avec icônes, CTA clairs. |
| **Mes réservations** (`/compte/reservations`) | Liste des réservations (passées et à venir). Pour chaque : trajet (départ → arrivée, date, heure), chauffeur, statut (confirmé, en cours, terminé, annulé), montant. Actions : Voir détail, Message chauffeur, Noter (si terminé). Filtres ou onglets : À venir / Terminées. |
| **Mes demandes** (`/compte/demandes`) | Liste des demandes créées par le client (trip_requests). Pour chaque : itinéraire, date, statut (ouverte, avec propositions, clôturée). Action : Voir les propositions, Modifier/Annuler si ouverte. |
| **Messages** | Déjà existant (`/messages`) : conversations par réservation. Reste accessible depuis le header et depuis chaque réservation. |
| **Mon profil** (`/compte/profil`) | Modifier : nom, téléphone, ville. Pas de véhicule ni documents. |

### 2.4 Comportement

- Si **non connecté** : Accueil, Recherche, Demander (avec redirection connexion si besoin pour réserver ou publier une demande).
- Si **connecté client** : en plus, lien « Mon compte » (ou « Mon espace ») dans le header → hub avec réservations, demandes, profil. Le clic sur le nom/avatar peut ouvrir un menu déroulant : Mon compte, Mes réservations, Mes demandes, Messages, Mon profil, Déconnexion — ou rediriger vers `/compte`.

### 2.5 Existant à réutiliser

- Recherche (`/recherche`), Demande (`/demande`, `/demande/[id]`), Réservation (`/reservation`), Messages (`/messages`, `/messages/[bookingId]`), Avis (`/avis/[bookingId]`).
- Données : `bookings` (client_id), `trip_requests` (client), `profiles`.

---

## 3. Chauffeur

### 3.1 Objectif

Publier des trajets, répondre aux demandes, gérer ses réservations, ses crédits et son profil (véhicules, documents).

### 3.2 Navigation (layout chauffeur)

**Sidebar** (desktop) + **barre bas** (mobile) :

| Lien | Label | Rôle |
|------|--------|------|
| `/chauffeur` | Tableau de bord | Vue d’ensemble, accès rapides |
| `/chauffeur/trajet/nouveau` | Publier un trajet | Création trajet (départ, destination, date, heure, places, prix) |
| `/chauffeur/reservations` | Mes réservations | Liste des réservations acceptées (bookings où driver_id = moi) : trajet, client, date, statut, lien messagerie |
| `/chauffeur/demandes` | Demandes | Demandes ouvertes, proposer un prix |
| `/chauffeur/credits` | Crédits | Solde, historique, recharge (Wave) |
| `/chauffeur/profil` | Mon profil | Infos perso, véhicules, documents |

### 3.3 Tableau de bord chauffeur (existant, à enrichir)

- Blocs : Demandes ouvertes (aperçu + lien), Publier un trajet, Crédits (solde + recharge).
- **À ajouter** : bloc « Mes réservations » (prochains départs ou nombre de réservations à venir) avec lien vers `/chauffeur/reservations`.

### 3.4 Page « Mes réservations » chauffeur

- Liste des `bookings` où `driver_id = user.id`, avec infos trajet (from_city, to_city, departure_time), client (nom), passagers, total FCFA, statut.
- Actions : Message client, Marquer comme terminé (si applicable).

### 3.5 Existant à réutiliser

- Layout chauffeur, dashboard, trajet/nouveau, demandes, credits, profil. Manque uniquement la page et le lien « Mes réservations ».

---

## 4. Partenaire

### 4.1 Objectif

Recruter des chauffeurs (lien d’invitation), suivre la flotte et les commissions.

### 4.2 Navigation (layout partenaire)

| Lien | Label | Rôle |
|------|--------|------|
| `/partenaire` | Tableau de bord | Lien d’invitation, KPIs (nombre chauffeurs, commissions en attente) |
| `/partenaire/chauffeurs` | Mes chauffeurs | Liste des chauffeurs rattachés |
| `/partenaire/commissions` | Commissions | Détail des commissions (en attente, versées) |
| `/partenaire/profil` | Mon profil (optionnel) | Modifier raison sociale, contact, téléphone, email |

### 4.3 Tableau de bord partenaire (existant)

- Déjà en place : lien d’invitation (copier), carte « Mes chauffeurs », carte « Commissions en attente ». Suffisant pour la V1.

### 4.4 Option « Mon profil partenaire »

- Page simple : formulaire édition `partners` (company_name, contact_name, phone, email). L’invite_code reste en lecture seule. À ajouter si besoin.

---

## 5. Récapitulatif des écrans par rôle

| Rôle | Hub / Dashboard | Pages principales |
|------|------------------|-------------------|
| **Client** | `/compte` (Mon compte) | Réservations, Demandes, Profil ; + Messages (header) |
| **Chauffeur** | `/chauffeur` | Publier trajet, Mes réservations, Demandes, Crédits, Profil |
| **Partenaire** | `/partenaire` | Mes chauffeurs, Commissions, (Profil) |

---

## 6. Header selon le rôle

- **Non connecté** : Accueil, Trajets, Demander, Messages (optionnel) ; boutons Se connecter / S’inscrire.
- **Client** : Accueil, Trajets, Demander, Messages ; **Mon compte** (lien ou menu) ; avatar + Déconnexion.
- **Chauffeur** : Accueil, Trajets, Demander, Messages ; **Espace chauffeur** (lien `/chauffeur`) ; bouton Chauffeur ; avatar → lien vers `/chauffeur/profil` ; Déconnexion.
- **Partenaire** : Accueil, Trajets, Demander, Messages ; **Espace partenaire** (lien `/partenaire`) ; bouton Partenaire ; avatar → `/partenaire` ; Déconnexion.

Pour le **client**, le clic sur l’avatar ou « Mon compte » mène vers `/compte` (hub) afin d’avoir une expérience cohérente avec les deux autres rôles (chacun a un « espace » dédié).

---

## 7. Suite d’implémentation

1. **Client** : créer les routes `/compte`, `/compte/reservations`, `/compte/demandes`, `/compte/profil` ; ajouter le lien « Mon compte » dans le header pour les clients ; réutiliser les données bookings, trip_requests, profiles.
2. **Chauffeur** : ajouter « Mes réservations » dans la nav et la page `/chauffeur/reservations`.
3. **Partenaire** : optionnel, ajouter `/partenaire/profil` pour édition de la fiche partenaire.

Ce document sert de référence pour toute évolution des interfaces (carte, notifications, statistiques avancées).
