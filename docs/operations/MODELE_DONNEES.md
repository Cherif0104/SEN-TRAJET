# Modèle de données SentraJet OS

Version : 1.0 — 16 août 2026  
Objectif : un référentiel maître sans doublons ni mauvaises relations.

## 0. Conventions

| Préfixe matricule | Entité |
|-------------------|--------|
| `SJP-CL-######` | Client |
| `SJP-PT-######` | Partenaire commercial (organisation) |
| `SJP-OW-######` | Propriétaire / investisseur (actif) |
| `SJP-VH-######` | Véhicule |
| `SJP-DR-######` | Chauffeur |
| `SJ-####` | Référence réservation (existant) |

- Les matricules **ne changent jamais**.
- Soft-delete préféré (`archived_at`) plutôt que DELETE dur sur les dossiers métier.
- Toute modification sensible → `audit_logs`.

---

## 1. Identité & accès (Users)

```
auth.users
  └── profiles (1:1)
  └── user_roles (1:N)     app_role enum
```

| Concept | Table | Notes |
|---------|-------|-------|
| Utilisateur Auth | `auth.users` | Login |
| Profil | `profiles` | Affichage, téléphone |
| Rôles internes / externes | `user_roles` | RBAC ; multi-rôles possible |
| Permissions fines | (à venir `role_permissions`) | Modules admin |

**Ne pas** créer un compte Auth pour un partenaire prospect.

Rôles externes autorisés seulement après validation :

- `client` — espace `/compte`
- `partner` — espace `/partenaire` (certifié ACTIF)
- `driver` — espace `/chauffeur`
- (owner) — espace `/proprietaire` via `vehicle_owners`

---

## 2. CRM & Clients (référentiel maître)

```
clients (matricule SJP-CL-*)
  ├── bookings
  ├── crm_activities
  ├── quotes / invoices / payments
  └── leads (optionnel, pipeline acquisition)
```

### `clients`

| Champ | Rôle |
|-------|------|
| `matricule` | `SJP-CL-000001` immuable |
| `user_id` | Lien compte Auth (nullable tant que guest) |
| Identité | nom, téléphone, WhatsApp, email, adresse, société |
| `client_type` | particulier / entreprise |

### `crm_activities`

Activité CRM unifiée (remplace / complète `interactions`) :

| Champ | Rôle |
|-------|------|
| `client_id` / `partner_org_id` / `lead_id` | Cible |
| `channel` | appel, whatsapp, email, visite, autre |
| `direction` | inbound / outbound |
| `motif` | demande_tarif, reservation, reclamation, relance… |
| `handled_by` | collaborateur SentraJet |
| `occurred_at` | quand |
| `next_action_at` / `next_action_label` / `next_action_assignee` | planification |
| `status` | open / done / cancelled |

### Pipeline (existant à brancher)

`leads` → `opportunities` → `quotes` → `bookings`  
`lead_assignments.assigned_to` pour le commercial propriétaire.

---

## 3. Partenaires

### Séparation obligatoire

```
partner_organizations          ← partenaire COMMERCIAL (hôtel, agence…)
vehicle_owners                 ← partenaire ACTIF / investisseur
partner_contracts              ← contrat tarifaire commercial
vehicle_exploitation_contracts ← contrat d’exploitation véhicule
```

### `partner_organizations`

| Champ | Rôle |
|-------|------|
| `matricule` | `SJP-PT-*` |
| `relation_kind` | `commercial` (défaut) |
| `category` | hotel, conciergerie, travel_agency, enterprise, other |
| `certification_status` | prospect → … → actif |
| `primary_contact_*` | contacts |
| `user_id` | **null** jusqu’à ACTIF + création compte |
| Diagnostic JSON | chambres, volumes, navettes, etc. |

### Funnel `certification_status`

`prospect` | `diagnostic` | `en_verification` | `approuve` | `contrat_en_attente` | `actif` | `suspendu` | `archive`

### `partner_diagnostics`

Snapshot du diagnostic commercial (catégorie + champs structurés).

### `vehicle_owners`

Déjà présent. Matricule `SJP-OW-*` à ajouter.  
Statuts : prospect → actif…  
Lié aux véhicules via contrats d’exploitation.

---

## 4. Flotte & opérations

```
vehicles ←── vehicle_exploitation_contracts ──→ vehicle_owners
drivers
vehicle_driver_assignments
bookings → service_orders → dispatch_assignments
booking_status_history
```

Pour chaque véhicule tiers : propriétaire, type de propriété, contrat, coûts, revenus, documents.

---

## 5. Réservations & tarification

```
bookings
  ├── client_id / partner_contract_id / lead_id
  ├── pricing_segment (client|partner)  ← couche tarifaire
  ├── distance_km (routière)
  ├── tariff_version_code (snapshot)
  └── payments / invoices
```

Catalogue : `pricing_tariff_versions` + `pricing_tariff_rules`  
Couches : `public` | `partner` | `supplier` (jamais exposer supplier au client).

---

## 6. Finance (objets distincts)

```
finance_accounts          ← plan de comptes / caisses / banques / tiers
finance_account_entries   ← mouvements (phase 2)
invoices / payments       ← déjà présents
```

| Type de compte | Exemple |
|----------------|---------|
| `bank` | Banque principale |
| `cash` | Caisse Dakar |
| `partner` | Suivi partenaire |
| `supplier` | Dettes transporteur |
| `clearing` | Transit |

Un **utilisateur** ≠ un **compte financier**.

---

## 7. RH (phase ultérieure)

`employees`, `hr_contracts`, `absences`, `payroll_runs`  
Séparé des comptes Auth opérationnels (lien optionnel `user_id`).

---

## 8. Audit

Table existante `audit_logs` :

| Champ | Rôle |
|-------|------|
| `actor_user_id` | Qui |
| `action` | create / update / delete / login / export… |
| `entity` / `entity_id` | Quoi |
| `meta` | before/after, IP, etc. |
| `created_at` | Quand |

À brancher sur clients, partenaires, bookings, tarifs, rôles.

---

## 9. Cartographie « ne pas dupliquer »

| Besoin métier | Table maître | À éviter |
|---------------|--------------|----------|
| Client final | `clients` | Recréer un client dans `partners` |
| Partenaire B2B | `partner_organizations` | Table `partners` marketplace legacy |
| Propriétaire véhicule | `vehicle_owners` | Le stocker comme `clients` |
| Activité CRM | `crm_activities` | Notes dispersées sans `handled_by` |
| Tarif | `pricing_tariff_*` | Hardcode dans composants React |
| Contrat B2B | `partner_contracts` | Activer sans funnel |
| Compte Auth partenaire | `auth.users` + rôle | Création depuis `/inscription` |

---

## 10. Ordre d’implémentation recommandé

1. Matricules clients + `crm_activities` + audit helper  
2. `partner_organizations` + funnel + page contact public  
3. Brancher `/admin/crm` sur activités + prochaines actions  
4. Snapshot tarif sur `bookings`  
5. Finance accounts  
6. RH  

Voir migrations `202608161700_sentrajet_os_foundations.sql`.
