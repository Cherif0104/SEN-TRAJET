# Parcours client — Analyse de bout en bout

Analyse du parcours client depuis **l’inscription** jusqu’à **l’arrivée à destination** (et au-delà : avis, réclamation, support). Ce document sert de référence pour aligner l’existant et identifier les manques.

---

## 1. Vue d’ensemble du flux

```mermaid
flowchart TB
  subgraph inscription [Inscription / Connexion]
    A[Landing /] --> B{Connecté ?}
    B -->|Non| C[Connexion]
    B -->|Client| D[/compte]
    C --> E[Inscription]
    E --> F[Choix Client]
    F --> G[Formulaire email/tél]
    G --> D
  end

  subgraph recherche [Recherche trajet]
    D --> H[Trouver un trajet]
    H --> I[/recherche]
    I --> J[Formulaire départ, destination, date, budget]
    J --> K[Résultats trajets]
    K --> L[Fiche trajet /trajet/id]
    L --> M[Réserver]
  end

  subgraph reservation [Réservation]
    M --> N[/reservation]
    N --> O[Passagers, point de rencontre]
    O --> P[Confirmation]
    P --> Q[Confirmé]
    Q --> R[Mes réservations]
  end

  subgraph alternative [Alternative : Demande]
    D --> S[Publier une demande]
    S --> T[/demande]
    T --> U[/demande/id propositions]
    U --> V[Accepter proposition]
    V --> W[Booking créé]
    W --> R
  end

  subgraph apres [Après réservation]
    R --> X[Messages chauffeur]
    R --> Y[Voir le trajet]
    R --> Z[Suivi trajet]
    Z --> AA[Arrivée destination]
    AA --> AB[Noter / Avis]
    AB --> AC[Réclamation / Support]
  end
```

---

## 2. Parcours détaillé par étape

### 2.1 Inscription

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Arrivée sur le site | `/` (landing) | Oui | Redirection client → `/compte` si connecté |
| Clic « S’inscrire » | `/inscription` | Oui | Header, footer |
| Choix rôle Client | Page inscription | Oui | Carte « Client » → formulaire direct |
| Formulaire | Email ou Téléphone + OTP | Oui | Nom, email/mot de passe ou tél + SMS |
| Après inscription | Redirection `/` puis `/compte` | Oui | Via LandingOrRedirect |

**Manques identifiés :** Aucun pour l’inscription client. Pré-remplissage `?role=partenaire` géré.

---

### 2.2 Connexion

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Clic « Connexion » | `/connexion` | Oui | Header |
| Email / mot de passe ou OTP | Formulaire | Oui | Comptes démo disponibles |
| Paramètre `next` | Redirection après login | Oui | Vers page demandée (ex. `/reservation?trajet=...`) |
| Déjà connecté sur `/connexion` | Redirection hub | Oui | Évite de rester sur la page login |

**Manques identifiés :** Aucun.

---

### 2.3 Tableau de bord client (Mon compte)

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Hub client | `/compte` | Oui | Layout sidebar + barre bas mobile |
| Onboarding première visite | Bloc « Bienvenue » | Oui | Dismissible, icônes (course, colis, demande, messages) |
| CTA « Trouver un trajet » | → `/recherche` | Oui | |
| CTA « Publier une demande » | → `/demande` | Oui | |
| Accès Mes réservations | `/compte/reservations` | Oui | |
| Accès Mes demandes | `/compte/demandes` | Oui | |
| Accès Messages | `/messages` | Oui | Lien dans nav compte + header |
| Accès Mon profil | `/compte/profil` | Oui | Nom, téléphone, ville |
| Accès Support / Réclamation | — | **Manquant** | Pas de lien explicite « Réclamation » ou « Aide » depuis le compte |

**Manques identifiés :** Lien « Aide / Réclamation » ou « Nous contacter » depuis l’espace compte (ex. footer du layout ou bloc dans le dashboard).

---

### 2.4 Recherche de trajet

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Clic « Trouver un trajet » | `/recherche` | Oui | Formulaire en premier (pas de liste par défaut) |
| Saisie départ / destination | Formulaire | Oui | Datalist villes Sénégal |
| « Ma position » (géoloc) | Boutons Départ / Destination | Oui | Reverse geocode si clé Google |
| Budget max (FCFA) | Champ optionnel | Oui | Filtre côté API |
| Date / heure | Champs optionnels | Oui | |
| Clic « Rechercher les trajets » | Résultats sous le formulaire | Oui | Données réelles (Supabase), pas de mock |
| Filtres (catégorie, prix, places) | Panneau Filtrer | Oui | Côté client sur les résultats |
| Clic sur un trajet | `/trajet/[id]` | Oui | Fiche détail |

**Manques identifiés :** Aucun pour la recherche. Données 100 % réelles.

---

### 2.5 Fiche trajet et réservation

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Fiche trajet | `/trajet/[id]` | Oui | Carte, chauffeur, véhicule, prix, CTA « Réserver » |
| Données trajet | `fetchTripById` (Supabase) | Oui | Réel |
| Clic « Réserver ce trajet » | `/reservation?trajet=...` | Oui | |
| Non connecté | CTA « Se connecter pour réserver » | Oui | `next` vers réservation |
| Formulaire réservation | Passagers, point de rencontre | Oui | Nombre de passagers plafonné aux places dispo |
| Confirmation | Création booking (Supabase) | Oui | |
| Après confirmation | Liens Mes réservations, Voir le trajet, Autre trajet | Oui | |

**Manques identifiés :** Aucun pour le flux réservation standard.

---

### 2.6 Mes réservations

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Liste des réservations | `/compte/reservations` | Oui | Données Supabase (bookings + trip) |
| Affichage par réservation | Trajet, date, chauffeur, montant, statut | Oui | |
| Action « Message » | → `/messages/[bookingId]` | Oui | |
| Action « Voir le trajet » | → `/trajet/[trip_id]` | Oui | |
| Action « Noter » | → `/avis/[bookingId]` | Oui | Pour trajet passé / completed |
| **Annuler une réservation** | — | **Manquant** | FAQ indique que c’est possible ; pas de fonction ni bouton |
| Détail d’une réservation | — | **Optionnel** | Pas de page `/compte/reservations/[id]` ; détail = trajet + messages |
| Filtres À venir / Terminées | — | **Optionnel** | Liste unique, pas d’onglets |

**Manques identifiés :**  
- **Annulation** : fonction `cancelBooking` (ou mise à jour statut) + bouton « Annuler » pour les réservations à venir (avec conditions à définir : délai, etc.).  
- Optionnel : onglets « À venir » / « Terminées », page détail réservation.

---

### 2.7 Parcours « Demande » (pas de trajet trouvé)

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Clic « Publier une demande » | `/demande` | Oui | Depuis compte ou header « Demander » |
| Non connecté | Redirection `/connexion?next=/demande` | Oui | À la soumission |
| Formulaire | Départ, destination, date, créneau, type, passagers, notes | Oui | |
| Après création | Redirection `/demande/[id]` | Oui | |
| Détail demande | Propositions des chauffeurs (ProposalList) | Oui | |
| Accepter une proposition | Création booking, redirection `/compte/reservations` | Oui | |
| Annuler la demande | Bouton « Annuler » (demande ouverte) | Oui | `cancelRequest` |
| Liste Mes demandes | `/compte/demandes` | Oui | Liens vers `/demande/[id]` |

**Manques identifiés :** Aucun pour le flux demande → proposition → réservation.

---

### 2.8 Messages

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Liste conversations | `/messages` | Oui | Par réservation (booking) |
| Non connecté | Redirection `/connexion?next=/messages` | Oui | |
| Clic conversation | `/messages/[bookingId]` | Oui | ChatBox, envoi/réception (Supabase) |
| État vide | Message + lien « Trouver un trajet » | Oui | |

**Manques identifiés :** Aucun.

---

### 2.9 Pendant le trajet (jusqu’à l’arrivée)

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Suivi en temps réel (position chauffeur) | — | **Non** | Prévu dans la vision ; non implémenté |
| Carte « Où est le chauffeur ? » | — | **Non** | À venir |
| Distance restante / ETA | — | **Non** | À venir |
| Statut réservation « en cours » | Affichage `status` dans Mes réservations | Partiel | Le statut existe en base ; pas de vue dédiée « Trajet en cours » avec suivi |

**Manques identifiés :**  
- Suivi temps réel (position, ETA) : à prévoir (Supabase Realtime ou polling + carte).  
- Page ou bloc « Trajet en cours » (optionnel) avec lien vers suivi.

---

### 2.10 Arrivée à destination / après le trajet

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Marquer le trajet comme terminé | Côté chauffeur (éventuel) | À clarifier | Si statut `completed` est mis à jour par le chauffeur ou automatiquement |
| Affichage « Terminé » dans Mes réservations | Statut + date passée | Oui | |
| Bouton « Noter » | → `/avis/[bookingId]` | Oui | Affiché pour trajet passé / completed |

**Manques identifiés :** Règles métier « quand passer en completed » (automatique à la date/heure, ou action chauffeur). Pas bloquant pour le parcours client actuel.

---

### 2.11 Avis / notation

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Page avis | `/avis/[bookingId]` | Oui | Étoiles, tags, commentaire |
| Soumission | `submitReview` (Supabase) | Oui | |
| Après envoi | Message « Merci », lien accueil | Oui | Lien « Mes réservations » possible pour cohérence |

**Manques identifiés :** Optionnel : après envoi, proposer « Retour à Mes réservations » en plus de l’accueil.

---

### 2.12 Réclamation / litige / support

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Page Contact | `/contact` | Oui | Email, texte « litiges : messagerie puis contact » |
| FAQ | `/faq` | Oui | Annulation, litige, etc. |
| CGU | `/cgu` | Oui | Réservations et annulations |
| **Lien depuis l’espace client** | — | **Manquant** | Pas de lien « Aide », « Réclamation » ou « Nous contacter » dans le compte |
| **Formulaire réclamation avec numéro de réservation** | — | **Optionnel** | Page dédiée ou pré-remplissage contact avec `?booking=...` |

**Manques identifiés :**  
- Dans l’espace client (layout ou dashboard) : lien visible vers « Aide / Réclamation » ou « Nous contacter » (→ `/contact`).  
- Optionnel : page `/reclamation` ou `/contact?subject=reclamation` avec champ « N° réservation » pour traçabilité.

---

### 2.13 Mon profil

| Étape | Route / action | Existant | Remarque |
|-------|----------------|----------|----------|
| Page profil | `/compte/profil` | Oui | Nom, téléphone, ville |
| Sauvegarde | `updateProfile` (Supabase) | Oui | |
| Email | Affiché en lecture seule | Oui | |

**Manques identifiés :** Aucun.

---

## 3. Synthèse des manques à traiter

| Priorité | Manque | Action proposée |
|----------|--------|------------------|
| Haute | Annulation d’une réservation par le client | Ajouter `cancelBooking` (mise à jour statut en base), puis bouton « Annuler la réservation » sur les réservations à venir (avec confirmation). |
| Haute | Accès réclamation / support depuis le compte | Ajouter dans le layout compte (ou dashboard) un lien « Aide / Réclamation » ou « Nous contacter » vers `/contact`. |
| Moyenne | Suivi trajet en temps réel (position, ETA) | Prévu dans la vision ; à implémenter plus tard (Realtime + carte). |
| Basse | Filtres « À venir » / « Terminées » dans Mes réservations | Onglets ou filtre sur la liste. |
| Basse | Page détail réservation `/compte/reservations/[id]` | Optionnel ; aujourd’hui détail = trajet + messages. |
| Basse | Après avis, lien « Mes réservations » | Ajouter un bouton en plus de « Retour à l’accueil ». |

---

## 4. Récapitulatif des routes client

| Route | Rôle | Statut |
|-------|------|--------|
| `/` | Landing ou redirection | OK |
| `/connexion` | Connexion + `next` | OK |
| `/inscription` | Inscription (client/chauffeur/partenaire) | OK |
| `/compte` | Tableau de bord client | OK |
| `/compte/reservations` | Liste réservations (annulation à ajouter) | À compléter |
| `/compte/demandes` | Liste demandes | OK |
| `/compte/profil` | Profil client | OK |
| `/recherche` | Recherche + formulaire + résultats (budget, géoloc) | OK |
| `/trajet/[id]` | Fiche trajet | OK |
| `/reservation` | Formulaire réservation + confirmation | OK |
| `/demande` | Création demande | OK |
| `/demande/[id]` | Détail demande + propositions | OK |
| `/messages` | Liste conversations | OK |
| `/messages/[bookingId]` | Conversation | OK |
| `/avis/[bookingId]` | Notation | OK |
| `/contact` | Contact / support (litiges) | OK — à lier depuis compte |
| `/faq`, `/cgu`, `/confidentialite`, `/comment-ca-marche` | Légales / aide | OK |

---

## 5. Prochaines étapes recommandées

1. **Implémenter l’annulation de réservation** : `cancelBooking` côté lib, bouton + modale de confirmation sur `/compte/reservations` pour les réservations à venir (statut `confirmed`).  
2. **Ajouter le lien Aide / Réclamation** dans l’espace client (sidebar ou bloc dashboard) vers `/contact`.  
3. Ensuite : traiter le parcours chauffeur, puis le suivi temps réel si priorité produit.

Ce document peut être mis à jour au fil des développements.
