# Vision et conception — SEN TRAJET

Document de référence pour finaliser la plateforme : logique métier, parcours utilisateurs, rôles (dont Partenaires), carte interactive, alignement landing / produit. À utiliser comme socle pour les développements et la suppression des données mock.

---

## 0. Positionnement produit (spécialisation)

SEN TRAJET **se spécialise** sur deux piliers pour éviter la dispersion et offrir une expérience claire :

| Pilier | Périmètre | Détail |
|--------|-----------|--------|
| **Transport interurbain** | Entre villes, régions, communes, arrondissements, quartiers | Dakar ↔ Thiès, Saint-Louis, Kaolack, Mbour, Ziguinchor, etc. **Location** (véhicule privatisé) ou **covoiturage** (places partagées). Géolocalisation temps réel pour le suivi trajet. |
| **Transport de colis** | Envoi de bagages et colis entre régions | Documents, effets personnels, petits colis d’un point à un autre (ville, commune, quartier). Traçabilité et validation de livraison. |

**Services non prioritaires (hors focus landing / V1)** : VTC urbain (Eco/Confort/Confort+), transfert aéroport (Blaise Diagne), livraison express type repas, cargo local (charges volumineuses). Ils peuvent rester en base (types de trajet) ou en « À venir » sur la landing, sans être mis en avant.

**Géolocalisation** : la plateforme vise une expérience type **Google Maps / Waze** (ou équivalent) : carte interactive pour la recherche (départ/arrivée, suggestion villes et lieux), tracé d’itinéraire, et **suivi en temps réel** du trajet (position chauffeur / colis). Intégration à prévoir (Google Maps API, Mapbox, ou autre) pour itinéraires, adresses et suivi live.

### 0.1 Particuliers et location de véhicules

De nombreux **particuliers** ont un véhicule à proposer à la location, **avec ou sans chauffeur**. Certains sont dans le **domaine touristique** ou proposent des véhicules pour **grands événements** (mariages, séminaires, etc.). La plateforme doit pouvoir **harmoniser** cet écosystème :

- **Avec chauffeur** : trajet ou mise à disposition + conducteur (déjà couvert par le modèle chauffeur / partenaire).
- **Sans chauffeur** (location) : mise à disposition du véhicule seul, réservation et paiement en ligne (à intégrer comme offre distincte ou complémentaire selon la roadmap).
- **Tourisme et événements** : véhicules dédiés (minibus, prestige) pour groupes ou occasions — même logique : réservation, paiement, visibilité.

L’objectif est que **tout passe par le paiement** et une expérience **unifiée** : un seul écosystème, pas compliqué pour les utilisateurs, **intuitif** de bout en bout.

### 0.2 Expérience utilisateur : mobile-first, responsive, intuitive

La plateforme vise la **digitalisation** d’un secteur dans un pays où l’adoption numérique est essentielle, **notamment au Sénégal**. L’expérience utilisateur est **prioritaire** :

- **Mobile-first et desktop** : l’application est **responsive** (mobile first + adaptée desktop). La **majeure partie des utilisateurs sera sur mobile** — les écrans, la navigation et les actions doivent être **maniables au doigt**, lisibles et rapides sur petit écran.
- **Desktop** : utilisation confortable depuis un ordinateur (recherche, tableau de bord partenaire, gestion des réservations) sans dégrader l’expérience mobile.
- **Moderne et intuitive** : parcours simples, pas de étapes inutiles, libellés clairs, boutons d’action visibles. **L’intuitivité et la maniabilité passent avant tout** pour que la solution soit adoptée largement.

---

## 1. Vision et objectifs

**SEN TRAJET** est une plateforme de **transport interurbain et de colis** au Sénégal. Elle met en relation :
- les **clients** (voyageurs) qui publient une demande de trajet ou cherchent un trajet ;
- les **chauffeurs** qui proposent un prix pour une demande (un prix par chauffeur, pas de négociation) ;
- les **partenaires** (gestionnaires de parc / de chauffeurs) qui recrutent et administrent des chauffeurs et perçoivent des commissions ;
- l’**admin** plateforme pour la modération et la configuration.

**Principes directeurs**
- Tarif : le chauffeur propose **un** prix ; le client **choisit** une proposition parmi plusieurs (pas de contre-offre ni de négociation en 3 tours).
- Données **persistantes et réelles** : plus de données mock ; tout passe par Supabase.
- Expérience **carte** : carte interactive type InDrive (recherche, trajets, suivi).
- **Landing** en phase avec les parcours réels (recherche, demande, réservation).
- **Mobile-first et responsive** : conception d’abord pour mobile (majorité des usages), puis desktop ; interface maniable, moderne et intuitive (voir § 0.2).
- **Harmonisation de l’écosystème** : un seul flux pour réserver, payer et encaisser ; parcours simple pour tous les acteurs (particuliers, chauffeurs, partenaires, location avec/sans chauffeur, tourisme).

---

## 2. Rôles et acteurs

| Rôle | Description | Parcours clés |
|------|-------------|----------------|
| **Client** | Voyageur qui cherche ou publie une demande de trajet | Inscription → Recherche / Demande → Choix d’une proposition → Réservation → Message chauffeur → Notation |
| **Chauffeur** | Conducteur qui propose des trajets (prix fixe par demande) | Inscription → Profil + véhicule + documents → Crédits → Réponse aux demandes (prix) → Réservations → Messagerie → Recharge crédits |
| **Partenaire** | Gestionnaire de flotte / de chauffeurs | Inscription partenaire → Tableau de bord “mes chauffeurs” → Suivi crédits & trajets → Commissions (crédits achetés + trajets réalisés) |
| **Admin** | Équipe SEN TRAJET | Modération, KPIs, gestion documents, paramètres plateforme |

### 2.1 B2B et typologie des partenaires

**Cible élargie** : au-delà des particuliers et communes, SEN TRAJET vise les **grandes entreprises** (et structures) qui disposent d'un **parc automobile** mais **n'ont pas d'outil de réservation**. Ces acteurs sont hébergés sur la plateforme : leurs véhicules (ou ceux de leurs chauffeurs) deviennent réservables en ligne ; les clients réservent, paient ; le partenaire reçoit le paiement et la visibilité sur les réservations.

**Deux profils de partenaire** (à affiner en termes métier) :

| Profil | Rôle | Description |
|--------|------|-------------|
| **Partenaire gestionnaire** (ou prestataire) | Administre sans forcément exploiter les trajets lui‑même | Recrute et gère des **chauffeurs** (liens d'invitation, codes parrain). Suit crédits, trajets réalisés, **commissions**. Peut être une agence, un intermédiaire, une structure sans flotte propre. |
| **Partenaire opérateur** (ou exécutant) | Dispose de véhicules et publie des trajets | A **des véhicules** (flotte propre ou gérée). **Publie des trajets** sur la plateforme. Le **client** voit et réserve ces trajets comme pour un chauffeur individuel : choix du type de véhicule (berline, SUV, minibus…), nombre de places, paiement en ligne. Le partenaire reçoit les réservations et les paiements. |

Un même partenaire peut cumuler les deux : gérer des chauffeurs **et** exploiter sa propre flotte (trajets publiés au nom du partenaire ou de ses chauffeurs). La plateforme doit permettre, côté partenaire, de distinguer « mes chauffeurs » et « mes véhicules / mes trajets », et côté client, une **expérience unifiée** : recherche, filtres par type de véhicule, réservation et paiement, que le trajet vienne d'un chauffeur indépendant ou d'un partenaire opérateur.

### 2.2 Expérience client : choix et visibilité du véhicule

Pour que la prise en charge côté client soit **globale** et rassurante, la recherche et la réservation doivent donner une **visibilité claire sur le véhicule** :

- **Type de véhicule avec icônes** : le client voit et peut filtrer par type — petite voiture, berline, grosse voiture / SUV, minibus, utilitaire (colis). Chaque type est associé à une **icône** pour une lecture rapide.
- **Catégorie confort** : Eco, Confort, Confort+ (déjà prévu), éventuellement « Utilitaire » pour les colis.
- **Nombre de places** : affiché sur chaque résultat (ex. « 4 places », « 7 places ») et utilisable en filtre si besoin.
- **Résumé par trajet** : type de véhicule (icône + libellé), catégorie, places, prix, chauffeur ou partenaire — le client choisit en toute connaissance.

Cette approche s'applique aux **trajets publiés** (recherche directe) et, dans la mesure du possible, aux **propositions** liées aux demandes (affichage du véhicule proposé avec le même niveau de détail).

---

## 3. Parcours intuitif (priorité)

L’objectif est un parcours **très simple** pour tout le monde.

### 3.0.1 Chauffeur : publier un trajet

1. Le chauffeur va dans une autre région → il **déclare son trajet**.
2. Il renseigne : **point de départ** (sa position actuelle ou ville de départ), **destination**, **date**, **heure** (précise, ex. 12h, ou « à partir de »).
3. Il **publie** → le trajet est immédiatement visible pour tous les clients qui font une recherche.
4. Les clients voient ce trajet dans les résultats (départ → destination, date, horaires, places, prix) et peuvent **réserver** tant qu’il reste des places.

### 3.0.2 Client : chercher et réserver

1. Le client ouvre la plateforme, saisit **départ**, **destination**, **date** (et éventuellement heure).
2. Il obtient une **liste de trajets** : chauffeurs qui partent pour cette destination à cette date, avec les horaires proposés.
3. Il choisit un trajet et **réserve** (nombre de places, point de rendez-vous si besoin).
4. Dès qu’une réservation est confirmée, le nombre de **places disponibles** du trajet diminue. Quand le véhicule est **complet** (ex. 4/4 places réservées), le trajet est **clôturé** : il reste visible en « Complet » ou n’apparaît plus dans les résultats « réservables ». Aucune nouvelle réservation possible.

### 3.0.3 Règles techniques

- **Trajets publiés** : statut `active`, `available_seats > 0` pour être réservables. Quand `available_seats` passe à 0 (ou réservations = total_seats), le trajet est considéré plein/clôturé.
- **Réservation** : à chaque création de booking (confirmé), décrémenter `trips.available_seats` du nombre de passagers. À faire en base (trigger) ou dans l’API de création de réservation.
- **Recherche** : filtrer par départ, destination, date (optionnel), et n’afficher que les trajets avec au moins une place (ou les afficher en « Complet » avec bouton Réserver désactivé).

### 3.0.4 Inscription : deux CTA puis type de véhicule (chauffeur)

- **Premier écran** : deux gros boutons — **Client** (je cherche un trajet / j’envoie un colis) et **Chauffeur** (j’ai un véhicule, je propose des trajets). Lien secondaire : « Vous gérez une flotte ? Devenir partenaire ».
- **Si Client** : formulaire classique (nom, email ou téléphone, mot de passe). Pas de choix véhicule.
- **Si Chauffeur** : **étape suivante** = choix du **type de véhicule** :
  - **Transport de personnes** (avec option petits colis : sachets, petits cartons, &lt; 10 kg).
  - **Véhicule utilitaire** (bagages, gros colis, charges &gt; 10 kg).
- Ensuite formulaire (nom, code parrain optionnel, email/téléphone, mot de passe). Le type de véhicule est enregistré en métadonnées (`driver_vehicle_type` : personnes | utilitaire) pour le profil chauffeur.

### 3.0.5 Véhicules : usage et catégorie

- À l’**inscription** (chauffeur) : choix **personnes** ou **utilitaire** (voir 3.0.4). À la **complétion du profil** : pour chaque véhicule, **catégorie confort** : **Eco**, **Confort**, **Confort+** (ou Utilitaire pour colis).
- Politique produit : nomenclature simple (Eco / Confort / Confort+). Les véhicules « personnes » peuvent accepter des **petits colis** en complément ; les **gros colis** passent par les utilitaires (voir 3.0.6).

### 3.0.6 Colis : petits vs gros (règle 10 kg)

- **Petits colis** (sachets, petits cartons, documents, effets personnels) : **&lt; 10 kg** → peuvent être pris en charge par les **chauffeurs dont le véhicule est dédié au transport de personnes**, comme **service additionnel**. Pas besoin d’utilitaire.
- **Gros colis / bagages** : **≥ 10 kg** (ou volumineux) → passent par les **véhicules utilitaires** (chauffeurs ayant choisi « Véhicule utilitaire » à l’inscription). Différenciation simple pour le client et le chauffeur.
- Parcours : à la création d’une demande ou d’un envoi colis, le client indique le type (ou le poids) ; la plateforme oriente vers les trajets « personnes » (avec option petits colis) ou « utilitaire » selon la règle.

### 3.0.7 Administration plateforme et comptes de test

- **Admin** : rôle qui **pilote** l’ensemble — clients, chauffeurs, partenaires. Actions : modération, validation des documents, paramètres plateforme, KPIs, gestion des partenaires et des règles de commission.
- **Comptes de test** : page **Comptes démo** (`/comptes-test`) avec **un clic** pour se connecter en tant que **Client**, **Chauffeur** ou **Partenaire**. Les comptes sont créés automatiquement (API `POST /api/test-login` avec magic link). Variable d’environnement optionnelle : `TEST_ACCOUNTS_PASSWORD` (défaut `TestPass123!`). Permet de tester tous les parcours sans créer de compte à la main.

---

## 3. Parcours détaillés

### 3.1 Client

1. **Inscription**  
   Email ou téléphone (+221) + OTP. Choix du rôle “Client”. Création du profil (nom, téléphone, ville).

2. **Recherche de trajet**  
   - Saisie **départ**, **destination**, **date** (et optionnellement heure).  
   - Résultats : **liste des trajets publiés** par les chauffeurs qui partent pour cette destination à cette date (horaires, places, prix). Les trajets **complets** (plus de place) ne sont plus réservables ou affichés comme « Complet ».  
   - Avec **carte interactive** (à venir) : suggestion villes, tracé.  
   - Si aucun trajet ne convient : le client peut **publier une demande** (voir ci-dessous).

3. **Publier une demande**  
   Si aucun trajet ne convient : créer une **demande** (départ, arrivée, date, créneau, passagers). Les chauffeurs voient les demandes et **proposent un prix** (un seul prix par chauffeur pour cette demande).

4. **Choisir une proposition**  
   Le client voit la liste des propositions (plusieurs chauffeurs, chacun avec **un** prix). Il **choisit une proposition** (pas de contre-offre) → création de la réservation (booking).

5. **Réservation et après**  
   Récap trajet, point de rendez-vous. **Messagerie in-app** avec le chauffeur. Après le trajet : **notation** (avis).

6. **Gestion du compte**  
   Mes réservations, mes demandes, historique, profil (nom, téléphone, ville).

### 3.2 Chauffeur

1. **Inscription**  
   Email ou téléphone + OTP. Rôle “Chauffeur”. Profil (nom, téléphone, ville).  
   Option : invité par un **partenaire** (lien ou code) → le chauffeur est rattaché au partenaire à l’inscription.

2. **Compléter le profil**  
   - **Véhicule(s)** : marque, modèle, places, **usage** (personnes ou colis), **catégorie** (Eco, Confort, Confort+), clim, etc.  
   - **Documents** : permis, carte grise, assurance, photo d’identité (upload Storage).  
   - Vérification par l’admin (statut “en attente” → “approuvé” / “refusé”).

3. **Publier un trajet** (parcours principal)  
   Le chauffeur déclare **départ** (position actuelle ou ville), **destination**, **date**, **heure** (précise ou « à partir de »), **places**, **prix** → publication. Le trajet apparaît dans la recherche des clients. Quand les places sont toutes réservées, le trajet est **complet** (clôturé aux nouvelles réservations).

4. **Crédits**  
   Pour répondre aux **demandes** (flux alternatif), le chauffeur doit avoir des **crédits**. Recharge via Wave. Chaque acceptation de sa proposition par un client débite des crédits.

5. **Répondre aux demandes** (optionnel)  
   Liste des demandes ouvertes. Le chauffeur propose **un prix** (FCFA) + message + véhicule. Pas de négociation : un envoi, le client accepte ou non.

6. **Réservations acceptées**  
   Réservations issues des **trajets publiés** (direct) ou des **propositions** (demandes). Le chauffeur voit “Mes réservations”, **messagerie** avec le client, suivi (date, lieu, passagers).

7. **Gestion du compte**  
   Profil, véhicules, documents, crédits, historique des propositions et réservations. Si rattaché à un partenaire : voir “Mon partenaire” (informations de contact ou lien vers l’espace partenaire).

### 3.3 Partenaire (nouveau)

1. **Inscription / onboarding**  
   Rôle “Partenaire”. Profil (nom de la structure, contact, zone ou région). Validation par l’admin si besoin.

2. **Recruter des chauffeurs**  
   - Création de **liens d’invitation** ou **codes** associés au partenaire.  
   - Les chauffeurs qui s’inscrivent via ce lien/code sont **rattachés** au partenaire (`chauffeur.partner_id` ou table `driver_partner`).

3. **Tableau de bord partenaire**  
   - Liste “Mes chauffeurs” (nom, statut vérification, crédits récents, trajets réalisés).  
   - Vue agrégée : total crédits achetés par mes chauffeurs, total trajets réalisés.

4. **Commissions**  
   - Règles configurables (ex. par l’admin) :  
     - **Sur les crédits** : X FCFA ou X % par recharge (ex. 100 FCFA par 1000 FCFA de crédits achetés).  
     - **Sur les trajets** : Y FCFA par trajet réalisé (réservation complétée) par un de ses chauffeurs.  
   - Table **commissions** : `partner_id`, `driver_id`, `type` (credit_purchase | trip_completed), `amount_fcfa`, `reference` (transaction_id ou booking_id), `status` (pending | paid), `created_at`.  
   - Page partenaire : “Mes commissions” (historique, solde à recevoir, éventuellement export).

5. **Gestion du compte**  
   Profil partenaire, paramètres, lien d’invitation à régénérer.

### 3.4 Admin

- Validation des documents chauffeurs, modération des comptes.  
- KPIs réels (chauffeurs, trajets, réservations, revenus crédits).  
- Gestion des partenaires (activer, désactiver, règles de commission).  
- Paramètres plateforme (packs de crédits, montants commission, etc.).

---

## 4. Logique métier simplifiée (sans contre-offre)

- **Demande** : le client crée une demande (départ, arrivée, date, passagers, etc.).  
- **Proposition** : chaque chauffeur envoie **une** proposition avec **un** prix (et message, véhicule). Pas de round 2/3, pas de contre-offre client/chauffeur.  
- **Choix** : le client consulte les propositions et **accepte une seule** → création du booking, débit des crédits du chauffeur, les autres propositions sont rejetées.  
- **Implémentation** : on peut **désactiver** ou **retirer** l’UI et la logique de contre-offre (negotiation_round, counter_price_fcfa, counter_message, counterProposal, driverReplyToCounter, acceptCounterByDriver) pour ne garder que le flux “une proposition = un prix, le client accepte ou refuse”.

---

## 5. Partenaires et commissions

### 5.1 Modèle de données suggéré

- **Table `partners`**  
  `id`, `user_id` (FK auth / profiles), `company_name`, `contact_name`, `phone`, `email`, `invite_code` (unique), `is_active`, `created_at`, `updated_at`.

- **Lien chauffeur – partenaire**  
  Dans `profiles` ou table dédiée : `driver_id`, `partner_id` (nullable). Si le chauffeur s’inscrit via le lien partenaire, on renseigne `partner_id`.

- **Table `partner_commissions`**  
  `id`, `partner_id`, `driver_id`, `type` (enum : `credit_purchase` | `trip_completed`), `amount_fcfa`, `reference` (payment_intent_id ou booking_id), `status` (pending | paid), `paid_at`, `created_at`.

### 5.2 Règles de commission (exemples)

- **Sur achat de crédits** : pour chaque recharge (payment_intent completed), si le chauffeur a un `partner_id`, créer une ligne `partner_commissions` avec `type = credit_purchase`, `amount_fcfa = f(amount_fcfa)` (ex. 10 % ou 100 FCFA par 1000 FCFA).  
- **Sur trajet réalisé** : quand un booking passe à `completed`, si le chauffeur a un `partner_id`, créer une ligne avec `type = trip_completed`, `amount_fcfa` fixe ou variable.  
- Les montants et pourcentages peuvent être en table de config (ex. `platform_settings` ou `commission_rules`) pour que l’admin les modifie.

### 5.3 Flux technique

- **Trigger ou logique métier** après `credit_recharge` (ou après mise à jour `payment_intents` en completed) : si `driver.partner_id` présent → insert `partner_commissions`.  
- **Trigger ou logique** après passage d’un booking à `completed` : idem pour `trip_completed`.  
- **Espace partenaire** : routes `/partenaire/*`, middleware comme pour `/chauffeur` et `/admin`, tableau de bord “Mes chauffeurs” et “Mes commissions”.

---

## 6. Carte interactive (type InDrive)

- **Objectif** : une carte centrale pour la recherche, la visualisation des trajets et le suivi, comme sur InDrive.

- **Fonctionnalités visées**  
  - **Recherche** : saisie départ/arrivée avec **autocomplétion** (villes Sénégal) et affichage du tracé ou de la zone sur la carte.  
  - **Résultats** : sur la carte, afficher les trajets ou demandes (marqueurs départ/arrivée, ou segments). Clic sur un marqueur → détail (prix, chauffeur, lien vers la fiche).  
  - **Demande** : lors de la création d’une demande, afficher la carte avec départ/arrivée sélectionnés.  
  - **Suivi** : pour un booking en cours, **carte temps réel** (position chauffeur / client si partagée), comme le `TripLiveMap` actuel, mais bien mis en avant (page “Mon trajet en cours” ou intégré dans la conversation).

- **Techno**  
  - Cible expérience type **Google Maps / Waze** : itinéraires, adresses (villes, communes, arrondissements, quartiers), suivi temps réel. Intégration possible : **Google Maps API**, **Mapbox**, ou **Leaflet** (déjà utilisé) avec fond de carte et géocodage.  
  - Utiliser les coordonnées existantes (`lib/geo.ts`, villes Sénégal) et une API de géocodage pour compléter lieux et adresses.  
  - Page **recherche** : carte à côté (ou au-dessus) de la liste des résultats ; filtres (date, prix) qui mettent à jour la carte.

---

## 7. Landing page alignée avec le produit

- **Sections à garder / adapter**  
  - **Hero** : accroche interurbain Sénégal, CTA “Rechercher un trajet” / “Publier une demande”.  
  - **Fonctionnement** : 3 étapes (Client : Chercher ou demander → Choisir une proposition → Voyager ; Chauffeur : S’inscrire → Proposer des prix → Recevoir des réservations).  
  - **Différenciation** : interurbain, prix proposés par les chauffeurs, mobile money, PWA.

- **Sections à rendre cohérentes**  
  - **“Trajets populaires”** : liens vers la **recherche réelle** avec départ/destination pré-remplis (déjà le cas avec `/recherche?depart=...&destination=...`). S’assurer que la recherche utilise bien les données Supabase (trajets et/ou demandes).  
  - **“Scénarios” / “Simulations”** : éviter des exemples fictifs déconnectés. Les remplacer par de **vrais parcours** (ex. “Dakar – Thiès”, “Saint-Louis – Dakar”) avec lien direct vers la recherche ou la création de demande, et rappel que les prix sont proposés par les chauffeurs.

- **Partenaires**  
  - Bloc “Vous gérez des chauffeurs ?” avec CTA “Devenir partenaire” → inscription partenaire ou page dédiée.

---

## 8. Données réelles : suppression du mock

- **Règle** : aucune donnée en dur côté front pour les trajets, réservations, demandes, propositions, crédits. Tout vient de **Supabase** (requêtes, RLS, Realtime si besoin).

- **Points à vérifier / compléter**  
  - **Recherche** : résultats basés sur les tables `trips` et/ou `trip_requests` (selon que l’on affiche des trajets publiés ou des demandes).  
  - **Détail trajet** : uniquement `fetchTripById` (déjà en place si mock retiré).  
  - **Réservation** : flux basé sur `bookings`, `fetchTripById`, `createBooking` (déjà prévus).  
  - **Demandes** : création et liste depuis `trip_requests` ; propositions depuis `proposals`.  
  - **Landing** : “Trajets populaires” et scénarios = liens + texte, pas de listes mock ; les chiffres ou exemples peuvent venir d’agrégats réels (ex. “X trajets cette semaine”) si une API ou un comptage existe.

---

## 9. Synthèse des évolutions à prévoir

| Domaine | Action |
|--------|--------|
| **Contre-offre** | Simplifier : retirer négociation 3 tours (colonnes optionnelles ou conservées pour historique), retirer UI “Contre-offrer” / “Accepter contre-offre” / “Proposer un nouveau prix”. Garder uniquement : chauffeur propose un prix → client accepte ou refuse. |
| **Partenaires** | Ajouter rôles `partner` + table `partners`, lien chauffeur–partenaire, table `partner_commissions`, règles (sur crédits + sur trajets), triggers ou logique après recharge et après booking completed, espace `/partenaire` (dashboard, mes chauffeurs, mes commissions). Étendre avec **typologie** : partenaire gestionnaire (administre chauffeurs) vs partenaire opérateur (flotte propre, publie des trajets) ; **B2B** : grandes entreprises sans outil de réservation hébergées sur la plateforme (réservation, paiement, encaissement). |
| **Choix véhicule (client)** | En recherche et réservation : filtres et affichage par **type de véhicule** (icônes : petite voiture, berline, SUV, minibus, utilitaire), **catégorie** (Eco, Confort, Confort+), **nombre de places**. Visibilité complète pour que le client choisisse en connaissance de cause (voir § 2.2). |
| **Carte** | Enrichir la recherche et la demande avec une **carte interactive** (Leaflet) : tracé départ–arrivée, marqueurs des trajets/demandes, clic pour détail. Page ou bloc “Mon trajet en cours” avec carte temps réel (TripLiveMap). |
| **Landing** | Aligner le contenu (scénarios, simulations) sur les vrais parcours et la recherche ; ajouter bloc Partenaires ; s’assurer que tous les CTA mènent aux bonnes pages avec données réelles. |
| **Données** | Audit final : plus aucun mock pour trajets, réservations, demandes, propositions ; tout chargé depuis Supabase. |
| **Location sans chauffeur** | Offre « véhicule à louer sans chauffeur » pour particuliers (et tourisme / événements) : réservation, paiement, harmonisation avec le reste de l’écosystème (voir § 0.1). |

---

## 10. Ordre de mise en œuvre suggéré

1. **Simplifier les propositions** : retirer l’UI et les appels contre-offre ; garder un flux “une proposition = un prix, acceptation client”.  
2. **Partenaires** : schéma DB (partners, driver–partner, partner_commissions), inscription partenaire, dashboard partenaire, calcul des commissions (triggers ou jobs).  
3. **Carte** : intégration carte interactive dans recherche et demande ; mise en avant du suivi temps réel (booking en cours).  
4. **Landing** : refonte des blocs “simulations” / scénarios + bloc Partenaires.  
5. **Choix véhicule côté client** : icônes par type (berline, SUV, minibus, utilitaire), filtres catégorie et places, visibilité complète en recherche et réservation (voir § 2.2).  
6. **B2B / Partenaire opérateur** : permettre au partenaire de publier des trajets (flotte propre), encaissement, distinction gestionnaire vs opérateur si besoin.  
7. **Audit données** : vérifier chaque page pour suppression définitive du mock et usage exclusif de Supabase.

Ce document peut servir de **référentiel produit** pour les choix métier et de **feuille de route** pour les développements (migrations, nouvelles pages, modifications des parcours existants).
