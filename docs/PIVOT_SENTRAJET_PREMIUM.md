# Pivot produit — SentraJet Premium (plateforme propriétaire)

Document de référence pour la reprise du projet. Remplace progressivement le positionnement « marketplace / mise en relation type Yango » par une **plateforme propriétaire** exploitée par SentraJet Premium.

Nom produit cible : **SentraJet Premium**  
Nom historique dans le code / docs : SEN TRAJET (à migrer progressivement côté branding).

---

## 1. Décision produit

| Avant (marketplace) | Maintenant (plateforme propriétaire) |
|---------------------|--------------------------------------|
| Mise en relation clients ↔ chauffeurs indépendants | SentraJet Premium **opère** le transport |
| Chauffeurs publient leurs trajets et proposent des prix | Les **chauffeurs appartiennent à la plateforme** (flotte interne) |
| Partenaire = gestionnaire de chauffeurs / commissions | Partenaire = **client B2B** qui réserve avec **tarifs partenaires** |
| Matching, crédits chauffeur, propositions concurrentes | **Réservation** + **affectation** des courses par l’équipe SentraJet |
| Plateforme = intermédiaire | Plateforme = **outil d’exploitation** + canaux de vente |

**Positionnement clair** : SentraJet Premium n’est plus une simple application de réservation inspirée de Yango. C’est **notre** plateforme, avec espaces dédiés, gestion clients, partenaires, flotte et opérations.

---

## 2. Objectif utilisateur

Quel que soit le besoin (voyage interurbain, déplacement, etc.), le client ou le partenaire :

1. Ouvre la plateforme  
2. Réserve  
3. SentraJet affecte un véhicule / chauffeur de **sa** flotte  
4. Suit la course jusqu’à la livraison / arrivée  

Pas de « choisir parmi plusieurs chauffeurs qui enchérissent ». L’expérience est celle d’une **compagnie de transport privée** digitale.

---

## 3. Les quatre espaces

### 3.1 Espace Client (`/compte`, parcours public de réservation)

- Inscription / connexion client  
- Réservation de trajet (départ, arrivée, date/heure, catégorie véhicule, options)  
- Suivi des réservations et du trajet  
- Historique, factures / reçus, messages support  
- Paiement selon les moyens activés (Wave, etc.)

**Rôle métier** : acheteur B2C.

### 3.2 Espace Partenaire (`/partenaire`)

- Compte partenaire (entreprise, hôtel, agence, collectivité, etc.)  
- Réservation pour ses besoins / ses clients  
- **Grille tarifaire partenaire** (prix négociés / conditions commerciales)  
- Suivi des réservations partenaires, facturation, historique  
- Éventuellement multi-utilisateurs côté partenaire (plus tard)

**Rôle métier** : acheteur B2B — **pas** un recruteur de chauffeurs indépendants.

> Legacy à déprécier : invitation de chauffeurs, crédits chauffeurs rattachés, commissions sur trajets chauffeur indépendant. Ces flux marketplace ne font plus partie du cœur produit SentraJet Premium.

### 3.3 Espace Entreprise / Ops (`/admin` et extensions)

Espace de l’équipe SentraJet Premium (propriétaire de la plateforme) :

- Gestion clients et partenaires  
- Gestion flotte : véhicules, disponibilité, classes de service  
- Gestion chauffeurs internes (profils, documents, affectation)  
- **Dispatch** : affecter une réservation → véhicule + chauffeur  
- Tarification (public / partenaire), paramètres, paiements, litiges  
- KPIs opérationnels (courses, occupation flotte, CA, etc.)

**Rôles** : `admin`, `super_admin`, et rôles ops déjà prévus (`commercial`, `regional_manager`, etc.).

### 3.4 Espace Chauffeur / Véhicule (`/chauffeur`)

- Chauffeurs **de la plateforme** (pas marketplace ouvert)  
- Voir les courses **affectées** (pas « publier un trajet pour attirer des clients »)  
- Accepter / démarrer / terminer une course  
- Navigation / suivi live, documents, statut disponibilité  
- Communication client si besoin

**Rôle métier** : exécutant flotte SentraJet.

---

## 4. Flux métier cible (simplifié)

```text
Client ou Partenaire
        │
        ▼
   Crée une réservation
        │
        ▼
   Ops SentraJet (Admin)
   valide / affecte chauffeur + véhicule
        │
        ▼
   Chauffeur exécute la course
        │
        ▼
   Suivi live → clôture → facturation
```

Variante V1 possible : auto-affectation selon règles (véhicule libre, zone, classe), avec reprise manuelle ops.

---

## 5. Conséquences sur l’existant (gap)

| Domaine | État actuel (marketplace) | Cible SentraJet Premium |
|---------|---------------------------|-------------------------|
| Publication trajet chauffeur | Chauffeur publie offre | Ops / planning crée les courses ; chauffeur reçoit l’affectation |
| Demandes + propositions prix | Client demande, chauffeurs proposent | Remplacé par **devis / réservation** à tarif catalogue |
| Partenaire commissions / invite chauffeurs | Cœur partenaire V1 | Remplacé par **tarifs B2B + réservation partenaire** |
| Crédits chauffeur | Wallet pour publier / répondre | Hors modèle (ou transformé en outils ops internes si besoin) |
| Admin | Modération + params | **Cockpit exploitation** (dispatch, flotte, tarifs, clients) |
| Branding | SEN TRAJET | SentraJet Premium (migration progressive UI + docs) |
| Location marketplace | Particuliers / partenaires loueurs | À arbitrer : garder en secondaire ou recentrer sur flotte propre |

### Ce qu’on réutilise

- Auth, profils, RBAC (`client`, `driver`, `partner`, rôles admin)  
- Espaces déjà amorcés : `/compte`, `/partenaire`, `/chauffeur`, `/admin`  
- Géoloc / carte / suivi live  
- Wave / checkout  
- Taxonomie véhicules & classes de service  
- Supabase + RLS comme socle données  

### Ce qu’on recentre ou déprécie

- Matching concurrentiel type InDrive/Yango  
- Propositions multi-chauffeurs  
- Onboarding chauffeur « ouvert à tous » sans validation flotte  
- Partenaire = agence de chauffeurs indépendants  
- Parcours « publier un trajet » comme acquisition client  

---

## 6. Roadmap d’implémentation (ordre recommandé)

### Phase A — Cadrage & socle (cette reprise)

1. Valider ce document comme nouvelle source de vérité produit  
2. Figé les libellés : Client / Partenaire / Ops / Chauffeur  
3. Inventaire des écrans à garder, adapter, masquer  

### Phase B — Réservation propriétaire (cœur)

1. Catalogue tarifs (public + partenaire)  
2. Parcours client : réserver sans choisir un chauffeur concurrent  
3. Parcours partenaire : même flux avec prix partenaire  
4. Table / états réservation adaptés au dispatch  

### Phase C — Dispatch & flotte

1. Admin : liste des réservations à affecter  
2. Affectation chauffeur + véhicule  
3. Espace chauffeur : courses assignées, start/finish  
4. Suivi live existant branché sur ce flux  

### Phase D — Exploitation & polish

1. Facturation partenaire, exports  
2. Branding SentraJet Premium  
3. Nettoyage des flux marketplace obsolètes (feature flags puis retrait)  
4. QA parcours bout-en-bout des 4 espaces  

---

## 7. Règles produit à ne pas perdre

- **Mobile-first** : majorité des usages sur téléphone  
- **Parcours simple** : peu d’étapes, libellés clairs  
- **Données réelles** : Supabase, pas de mock durable  
- **Flotte maîtrisée** : qualité de service = responsabilité SentraJet  
- **Partenaires = revenue B2B** via volume + tarifs, pas via commissions chauffeur  

---

## 8. Prochaine action concrète

Dès validation de ce pivot :

1. Spécifier le **parcours de réservation client V1** (champs, tarification, statuts)  
2. Spécifier le **écran dispatch admin V1** (affectation)  
3. Adapter l’espace partenaire : retirer invite/commissions chauffeur ; ajouter réservation + grille tarifaire  
4. Adapter l’espace chauffeur : file des courses assignées  

Ce fichier est le point d’entrée pour toute reprise de développement SentraJet Premium.
