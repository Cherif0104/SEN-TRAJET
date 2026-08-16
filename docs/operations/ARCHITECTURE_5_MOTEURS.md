# SentraJet Premium — Architecture des 5 moteurs

Document de référence technique et produit pour la refonte.  
Remplace le modèle « clone Yango / marketplace » par un **système d’exploitation** de l’activité de transport.

---

## Principe directeur

> **Aucune règle métier importante ne doit être codée en dur.**  
> Tarifs, seuils, pourcentages, délais, frais, statuts, conditions et exceptions sont **paramétrables** via l’administration (Control Center), persistés en base, versionnables.

---

## Vue d’ensemble

```text
                    ┌─────────────────────────────┐
                    │  SentraJet Control Center   │
                    │  (Admin / Ops / Finance)    │
                    └──────────────┬──────────────┘
                                   │ configure
     ┌─────────────┬───────────────┼───────────────┬──────────────┐
     ▼             ▼               ▼               ▼              ▼
 Booking       Pricing         Dispatch        Payment      Contract &
 Engine        Engine          Engine          Engine       Partner Engine
     │             │               │               │              │
     └─────────────┴───────────────┴───────────────┴──────────────┘
                                   │
                    Espaces: Client · Chauffeur · Partenaire · Propriétaire
```

---

## 1. Booking Engine

**Rôle** : cycle de vie complet d’une réservation.

| Capacité | Détail |
|----------|--------|
| Demande | Départ, destination, date/heure, pax, type, vol, notes |
| Validation | Demande → tarif/devis → validation → paiement → confirmation |
| Statuts | Machine à états (voir CGV §4) + historique |
| Modification | Réévaluation tarifaire si changement matériel |
| Annulation / no-show | Application des règles paramétrables |
| Preuves | Paiement, justificatifs, timeline |

**Tables** : `bookings`, `booking_status_history`, `service_orders`

---

## 2. Pricing Engine

**Rôle** : calcul du prix applicable.

Entrées : segment (client / partenaire / propriétaire), prestation, pax, distance, véhicule, options, zone.

Sorties : forfait | km | devis | règles partenaires.

Règles paramétrables :
- grilles AIBD aller / AIBD+retour
- interurbain FCFA/km + minimum
- attente (gratuit + tranche)
- majorations, exceptions, tarifs par partenaire

**Tables** : `sentrajet_tariffs`, `business_rules` (catégorie `pricing`)

---

## 3. Dispatch Engine

**Rôle** : affectation et exécution terrain.

| Capacité | Détail |
|----------|--------|
| Affectation | Chauffeur + véhicule (capacité, dispo, catégorie) |
| Réaffectation | Remplacement en cas d’incident |
| Mission | En route → Arrivé → Prise en charge → En cours → Terminée |
| Incidents | Déclaration chauffeur + reprise ops |

**Tables** : `drivers`, `vehicles`, `dispatch_assignments`, `service_orders`

---

## 4. Payment Engine

**Rôle** : encaissement, rapprochement, remboursements.

| Capacité | Détail |
|----------|--------|
| Wave | Redirect / lien Impulcia Afrique |
| Statuts | pending / paid / failed / refunded |
| Traces | montant, référence réservation, référence transaction, date, moyen |
| Remboursement | lié aux règles d’annulation |

**Tables** : `payments` (à enrichir), liens Wave existants

Lien Wave opérationnel (config) : `https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/`

---

## 5. Contract & Partner Engine

**Rôle** : B2B + propriétaires / investisseurs.

| Acteur | Capacité |
|--------|----------|
| Partenaire B2B | Grille tarifaire, demandes, facturation, marge commerciale |
| Propriétaire véhicule | Contrat d’exploitation, véhicule, documents, reporting |

Produit parallèle : **SentraJet Vehicle Partner**  
« Votre véhicule travaille. Nous nous occupons du reste. »  
Condition d’entrée : **à partir de 500 000 FCFA/mois** (non garanti — modalités contractuelles).

**Tables** : `partner_contracts`, `vehicle_owners`, `vehicle_exploitation_contracts`

---

## Control Center (Admin)

L’admin doit pouvoir modifier sans déploiement :
- Tarifs et seuils
- Pourcentages d’annulation et délais
- Frais d’attente
- Statuts autorisés / transitions
- Exceptions et conditions partenaires
- Paramètres Wave / contacts

---

## Espaces applicatifs

| Espace | Route | Acteur |
|--------|-------|--------|
| Client | `/compte` | Particulier / entreprise directe |
| Chauffeur | `/chauffeur` | Flotte SentraJet |
| Partenaire | `/partenaire` | B2B |
| Propriétaire | `/proprietaire` | Vehicle Partner |
| Control Center | `/admin` | Ops SentraJet |

---

## Ordre d’implémentation recommandé

1. Paramétrage (`business_rules` + admin règles)  
2. Pricing Engine complet (grilles + min + attente + annulation)  
3. Booking Engine (statuts + historique + paiement Wave)  
4. Dispatch Engine (mission temps réel)  
5. Contract Engine (B2B + propriétaires)  
6. Support / réclamations  

Référence métier et juridique (brouillon) : [`CGV_REGLES_RESERVATION.md`](./CGV_REGLES_RESERVATION.md)
