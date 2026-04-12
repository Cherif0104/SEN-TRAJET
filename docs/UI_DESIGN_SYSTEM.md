# Design system — SEN TRAJET

Référence légère pour garder une expérience **cohérente**, **moderne** et **mobile-first** sur l’ensemble de la plateforme (client, chauffeur, partenaire, B2B).

---

## 1. Fondations

### 1.1 Couleurs

- **Primaires**
  - `primary` : bleu principal (boutons, liens actifs) — ex. `#1D4ED8`
  - `primary-dark` : bleu foncé (hover, header) — ex. `#0B3BA8`
  - `primary-soft` : fond clair — ex. `#E0ECFF`
- **Secondaires**
  - `secondary` : vert (validation, succès léger) — ex. `#16A34A`
  - `secondary-soft` : fond vert clair — ex. `#DCFCE7`
- **Neutres**
  - Fond général : `#F5F5F5` (mobile) / `#FFFFFF` (cartes, modales)
  - Texte principal : `#111827`
  - Texte secondaire : `#6B7280`
  - Bordures : `#E5E7EB`
  - Ombres de cartes : shadow douce type `shadow-md` / `shadow-lg`
- **États**
  - Succès : `#16A34A`
  - Alerte : `#F59E0B`
  - Erreur : `#DC2626`
  - Info : `#0EA5E9`

> Objectif : conserver un contraste suffisant (surtout sur mobile en extérieur) tout en restant doux visuellement.

### 1.2 Typographie

- Police : **Inter** (déjà chargée).
- Tailles principales :
  - Titres 1 (pages) : `text-2xl` mobile, `text-3xl` desktop.
  - Sous-titres / sections : `text-xl` ou `text-lg`.
  - Texte courant : `text-sm` à `text-base`.
  - Légendes / labels UI : `text-xs`.
- Gras :
  - Titres / labels importants : `font-semibold` ou `font-bold`.
  - Texte courant : `font-normal`.

### 1.3 Rayons de bordure et espacement

- **Rayons**
  - Boutons, inputs : `rounded-lg`.
  - Cartes : `rounded-xl` ou `rounded-2xl` pour les gros blocs de dashboard.
- **Espacements**
  - Padding interne cartes : `p-4` mobile, `p-6` desktop.
  - Espacement entre sections : `mt-6` ou `mt-8`.
  - Grilles : `gap-4` mobile, `gap-6` desktop.

---

## 2. Composants communs

### 2.1 Boutons (`Button`)

- Variants principaux :
  - **Primary** : fond `primary`, texte blanc, hover `primary-dark`.
  - **Secondary** : fond blanc, bordure `primary` ou neutre, texte `primary` ; pour actions secondaires mais importantes.
  - **Outline / Ghost** : fond transparent ou neutre clair, pour actions moins critiques.
- Règles :
  - Toujours **libellé d’action clair** : « Réserver », « Publier un trajet », « Répondre », « Voir les demandes ».
  - **Icône à gauche** optionnelle (Lucide) pour guider visuellement (trajet, véhicule, message…).
  - Largeur :
    - Mobile : souvent `fullWidth` sur les actions principales (CTA).
    - Desktop : taille adaptée au contenu (boutons dans cartes, barres d’action).

### 2.2 Cartes (`Card`)

- Utilisation :
  - Blocs de dashboard (boardings client / chauffeur / partenaire).
  - Résumés de trajets, demandes, commissions.
- Style :
  - Fond blanc, `rounded-xl`, `border` léger (`border-neutral-200`), `shadow-card` ou `shadow-md`.
  - Contenu structuré avec titre, sous-texte, éventuellement icône dans un rond coloré à gauche.

### 2.3 Inputs / Select / Date & Time

- Inputs :
  - Hauteur confortable (`h-10` ou `h-11`), `rounded-lg`, bordure neutre.
  - Focus visible : bordure `primary` + légère ombre.
- Placeholders :
  - Courts et descriptifs : « Départ (ville ou commune) », « Destination », « Date », « Heure ».
- Messages d’erreur :
  - Texte `text-xs text-red-600` sous le champ, jamais uniquement via couleur de bordure.

### 2.4 Badges / Tags

- Pour :
  - Catégorie de véhicule (Eco, Confort, Confort+).
  - Type de trajet (personnes / colis, petits colis / utilitaire).
  - Statut (Réservé, Confirmé, Terminé, Annulé).
- Style :
  - `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs`.
  - Couleur de fond selon le statut (vert, ambre, gris…).

---

## 3. Layouts par rôle (mobile-first)

### 3.1 Client

- **Boarding `/compte`** :
  - Bloc d’accueil : avatar initiales + « Bonjour, [Prénom] ».
  - Deux gros boutons pleine largeur : « Trouver un trajet » (primary) et « Publier une demande » (secondary).
  - Section « Accès rapides » en dessous : cartes « Mes réservations » et « Mes demandes ».
- **Navigation** :
  - Mobile : barre bas d’écran pour le hub `/compte` (déjà implémentée).
  - Desktop : sidebar fixe à gauche.

### 3.2 Chauffeur

- **Boarding `/chauffeur`** :
  - Bloc d’accueil similaire client.
  - CTA principal très visible : « Publier un trajet ».
  - Cartes : Demandes, Mes trajets, Crédits, Mes réservations.

### 3.3 Partenaire

- **Boarding `/partenaire`** :
  - Bloc d’accueil avec nom de la structure.
  - Cartes : « Mes chauffeurs », « Commissions en attente », plus tard « Mes véhicules / Mes trajets ».

---

## 4. États et feedback

- **Chargement** :
  - Utiliser des skeletons ou spinners centrés pour les listes importantes (recherche, réservations, demandes, dashboards).
- **Succès** :
  - Bandeau ou toast discret (vert) + éventuellement texte court (« Trajet publié », « Demande créée », « Réservation confirmée »).
- **Erreur** :
  - Messages clairs, près de l’action concernée ; pas de simple « Une erreur est survenue ».

---

## 5. Accessibilité & contraintes Sénégal

- Contraste suffisant pour un usage en extérieur (écrans parfois peu lumineux).
- Touch targets : au moins **44x44px** sur mobile.
- Langage simple, francophone, sans jargon technique.

