# SentraJet Operating System — architecture produit

Version : 1.0 — 16 août 2026

## Principe fondamental

SentraJet Premium est le **système central de gestion** de l’entreprise.

Ce n’est **pas** un ERP/CRM SaaS offert gratuitement à chaque partenaire.

| Règle | Conséquence |
|-------|-------------|
| Un seul CRM maître | Celui de SentraJet (back-office) |
| Un seul référentiel maître | Clients, partenaires, flotte, tarifs, finance |
| Espaces externes limités | Consultation + demandes, pas d’administration |
| Compte partenaire | Créé **après** certification, jamais via inscription publique |

---

## Architecture des espaces

```
SENTRAJET PREMIUM
│
├── ESPACE ENTREPRISE / BACK-OFFICE   ← cœur OS
│   Super-admin · Rôles · Logs · CRM · Clients · Prospects
│   Partenaires · Réservations · Flotte · Finance · Contrats
│   RH · Tarification · Planning · Reporting · Audit
│
├── ESPACE CLIENT                    ← compte final
│   Simulations · Demandes · Réservations · Devis · Factures
│   Documents · Fidélité
│
├── ESPACE PARTENAIRE                ← interaction limitée (certifiés)
│   Simulations · Demandes · Réservations · Devis · Factures
│   Documents · Historique
│   ✗ pas de CRM autonome · ✗ pas de RH · ✗ pas d’ERP
│
└── ESPACE OPÉRATIONNEL (interne)
    Chauffeurs · Commerciaux · Flotte · Finance · RH
```

---

## Back-office entreprise

Piloté par le **super administrateur** et des sous-comptes internes à permissions précises.

| Profil interne | Périmètre |
|----------------|-----------|
| Commercial | Prospects, clients, appels, relances, devis, opportunités |
| Gestionnaire réservation | Demandes, affectation, suivi |
| Chauffeur | Missions, planning, statuts, incidents |
| Gestionnaire flotte | Véhicules, dispo, maintenance, documents, propriétaires |
| Caissier / Finance | Encaissements, caisse, factures, rapprochements |
| RH | Employés, contrats, absences, paie |

Chaque action sensible est journalisée (qui / quand / quoi / dossier).

---

## CRM maître

- Matricule client immuable : `SJP-CL-000001`
- Dossier : identité + historique commercial + interactions
- Chaque interaction enregistre le **collaborateur** et une **prochaine action** éventuelle
- Les relances / échéances (contrat, assurance, maintenance, impayé…) sont des actions planifiées

---

## Partenaires

### Deux familles (ne pas confondre)

| A. Partenaire commercial | B. Partenaire actif / investisseur |
|--------------------------|-------------------------------------|
| Hôtel, conciergerie, agence, entreprise, TO | Propriétaire véhicule, bailleur, investisseur, actionnaire |
| Contrat + tarif B2B | Contrat + actifs + flux financiers |
| Espace partenaire limité | Espace propriétaire / contrats flotte |

### Funnel de certification (commercial)

`PROSPECT → DIAGNOSTIC → EN_VERIFICATION → APPROUVE → CONTRAT_EN_ATTENTE → ACTIF`  
(+ `SUSPENDU` / `ARCHIVE`)

**Aucune création de compte Auth** depuis le site public.  
Parcours public : « Devenir partenaire » → WhatsApp / contact → diagnostic interne.

### Espace partenaire (après ACTIF)

Autorisé : simulation, demande, consultation réservations/devis/factures/documents/historique.  
Interdit : CRM autonome, RH, compta, création libre d’utilisateurs, admin des données SentraJet.

---

## Finance — objets distincts

Ne pas confondre :

- **Utilisateur** (droits d’accès)
- **Compte financier / ledger** (suivi comptable)
- **Compte bancaire**
- **Caisse**
- **Compte fournisseur / partenaire** (dettes / créances contractuelles)

Un employé n’a pas automatiquement un compte financier.

---

## Références techniques

- Modèle de données : [`MODELE_DONNEES.md`](./MODELE_DONNEES.md)
- Tarification : [`CHARTE_TARIFAIRE_V1.md`](./CHARTE_TARIFAIRE_V1.md)
- Implémentation UI admin : `/admin/*`
- Espace partenaire : `/partenaire/*` (limité)
- Contact partenaires : `/devenir-partenaire`
