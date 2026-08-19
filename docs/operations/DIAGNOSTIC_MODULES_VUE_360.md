# Diagnostic fonctionnel — modules et vues 360

Date : 16 août 2026  
Périmètre : application Next.js, APIs internes, Supabase Auth/Database/Storage/Edge Functions.

## 1. Décision métier structurante

Le terme historique `partner` couvrait deux relations qui n’ont ni les mêmes flux ni
les mêmes indicateurs :

- **Prestataire commercial** : hôtel, conciergerie, agence ou structure qui vend une
  prestation à son client et confie l’exécution à SentraJet. Sa performance se mesure
  par les réservations apportées, le chiffre d’affaires, la commission, la qualité et
  le renouvellement du contrat commercial.
- **Partenaire capital & actifs** : propriétaire de véhicule, banque, bailleur,
  location-vente, actionnaire ou investisseur. Sa relation porte sur un actif, un
  financement ou du capital. Elle se mesure par les contrats d’exploitation,
  échéances, loyers/remboursements, disponibilité et coût de cycle de vie.

Le schéma existant est conservé pour compatibilité :

- `partner_organizations` devient la source des **prestataires commerciaux** ;
- `vehicle_owners`, enrichi par `partner_kind`, devient la source des
  **partenaires capital & actifs** ;
- le rôle `asset_partner` ouvre l’espace propriétaire, sans donner accès aux tarifs
  ou réservations des prestataires commerciaux.

## 2. Comparaison aux systèmes de référence

### CRM / Customer 360

Les CRM modernes (Salesforce/HubSpot) organisent une fiche autour d’une identité
durable, d’une chronologie, de dossiers de service, des contrats, factures et
interactions. Le contrat est la source du revenu engagé ; la réservation et le
paiement restent les sources transactionnelles. Le socle SentraJet suit ce principe :
les tables métier existantes restent maîtres et les objets 360 les agrègent.

### Gestion de flotte

Fleetio/Samsara centralisent affectations, inspections, anomalies, entretien
préventif, coûts et historique conducteur/véhicule. SentraJet disposait des
affectations et missions, mais pas du cycle d’entretien. La nouvelle table
`vehicle_maintenance_records` comble ce manque et prépare les rappels au kilométrage
ou à date. La télématique et les diagnostics OBD restent une évolution ultérieure.

### PRM / portail de réseau

Un PRM distingue pipeline commercial, contrats, documents, commissions et audit des
paiements. SentraJet possède déjà CRM, contrats prestataires et réservations
segmentées. La vue 360 les réunit ; le calcul automatique et contradictoire des
commissions reste à relier au moteur financier.

## 3. État des modules

| Module | État vérifié | Source de vérité | Reste à industrialiser |
|---|---|---|---|
| Authentification et rôles | Opérationnel | Auth, `profiles`, `user_roles` | MFA et protection des mots de passe compromis |
| Comptes administrés | Opérationnel | Edge Function `admin-users` | Invitation par e-mail et rotation forcée du mot de passe temporaire |
| Profils et sécurité | Opérationnel | `profiles`, Auth, `account-media` | Recadrage d’image |
| Réservation publique/client | Opérationnel | `bookings`, RPC `submit_booking_demande` | Paiement final multi-prestataire |
| Réservation prestataire | Opérationnel sous contrat actif | `partner_contracts`, `bookings` | Quotas et ligne de crédit |
| Tarification | Opérationnel | règles tarifaires et moteur local | Versionnement/approbation à quatre yeux |
| Géocodage et distance | Opérationnel avec secours | Google/OSRM, `/api/distance` | SLO et cache géographique |
| Dispatch | Opérationnel | `service_orders`, `dispatch_assignments` | ETA temps réel et alertes d’écart |
| Chauffeurs | CRUD + fiche 360 | `drivers`, affectations, documents privés | score sécurité et renouvellement automatique des pièces |
| Véhicules | CRUD + fiche 360 | `vehicles`, contrats, missions, entretien | inspections mobiles, OBD/télématique, stock pièces |
| Clients | CRUD + fiche 360 | `clients`, réservations, paiements | dédoublonnage et score de santé |
| Prestataires commerciaux | Funnel + fiche 360 | `partner_organizations`, CRM, contrats | commissions automatiques et portail documentaire externe |
| Partenaires capital & actifs | CRUD + fiche 360 | `vehicle_owners`, contrats d’exploitation | échéancier automatique banque/location-vente |
| CRM | Opérationnel, volontairement central | leads, activités, entités 360 | SLA, tâches récurrentes et campagnes |
| Finance | Paiements + registre 360 | `payments`, `entity_financial_records` | numérotation légale, PDF, taxes et export comptable |
| Documents | Privé, signé, RLS | Storage `driver-documents` et `entity-documents` | antivirus et validation à deux niveaux |
| Rapports | Lecture opérationnelle | agrégats base | BI historisée et exports planifiés |
| Application installable | Opérationnelle | manifest, service worker, page mobile | publication stores native si requise |

## 4. Vue 360 livrée

Routes :

- `/admin/clients/[id]`
- `/admin/chauffeurs/[id]`
- `/admin/vehicules/[id]`
- `/admin/partenaires/[id]` — prestataire commercial
- `/admin/proprietaires/[id]` — partenaire capital & actifs

Chaque fiche propose :

1. identité, statut, données de contact et indicateurs ;
2. agrégats métier existants : réservations, missions, paiements, affectations,
   contrats d’exploitation et interactions CRM ;
3. chronologie transverse ;
4. dossiers de suivi/prise en charge avec priorité, échéance et statut ;
5. historique de contrats ;
6. documents privés (JPG, PNG, WebP, PDF, 10 Mo), servis par URL signée ;
7. factures et écritures financières ;
8. alertes d’expiration ;
9. entretien et coût de cycle de vie pour les véhicules.

## 5. Diagnostic APIs et Supabase

Tests exécutés :

- compilation Next.js : réussie, 78 routes générées ;
- ESLint : aucune erreur ;
- TypeScript strict : aucune erreur ;
- `/api/admin/users` sans session : `401`, attendu ;
- `/api/bookings/demande` avec corps incomplet : `400`, attendu ;
- `/api/places/autocomplete` : `200` ;
- `/api/vehicle-catalog` : `200` ;
- `/api/distance` avec coordonnées GPS : `200` ;
- tables 360 live : RLS active et une policy staff par table ;
- bucket `entity-documents` : privé, types et taille limités ;
- Edge Function `admin-users` version 3 : active.

Les deux réponses Supabase `500` observées sur 24 heures concernaient
`create_partner_prospect` à 16:42–16:43 UTC (`PostgREST 54001`) avant les migrations
de correction de récursion RLS. Aucun `500` ultérieur n’est présent dans les logs
consultés.

## 6. Alias de navigation, pas modules indépendants

Plusieurs anciennes URLs ne contiennent volontairement plus une seconde
implémentation. Elles redirigent vers la source unique :

- anciennes demandes, locations et réservations client → réservation ou historique ;
- trajets/réservations/demandes chauffeur → missions ;
- trajets admin → réservations ;
- anciennes commissions/chauffeurs/location prestataire → tableaux actifs.

Cette fragmentation est conservée comme compatibilité d’URL, pas comme promesse de
modules séparés. Les futures fonctionnalités doivent être ajoutées au CRM, à la
fiche 360 ou au dispatch, puis exposées par vues filtrées.

## 7. Points de vigilance

- Les helpers RLS `has_role` et `has_any_role` restent `SECURITY DEFINER` et
  exécutables uniquement par les utilisateurs authentifiés : c’est nécessaire aux
  policies actuelles, mais ils doivent rester minimaux et non anonymes.
- `submit_booking_demande` reste volontairement accessible anonymement ; la fonction
  valide désormais le segment tarifaire et ignore les identifiants privilégiés non
  autorisés.
- L’avertissement Supabase « leaked password protection disabled » relève de la
  configuration Auth du projet et doit être activé dans le Dashboard.
- Les écritures 360 complètent les paiements réels sans les remplacer. Une facture
  légale devra être générée par un service comptable dédié.

## 8. Suite technique recommandée

1. automatiser les échéances documents/contrats/entretien par Cron et notifications ;
2. générer factures PDF et échéanciers depuis des séquences légales ;
3. relier commissions prestataires et loyers partenaires aux paiements réconciliés ;
4. ajouter inspections départ/retour et signalement chauffeur ;
5. ajouter tests E2E authentifiés avec comptes de démonstration isolés ;
6. connecter télématique/OBD seulement après stabilisation du registre de flotte.
