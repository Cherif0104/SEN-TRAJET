# SENTRAJET PREMIUM — MASTER INSTRUCTIONS

> **IMPORTANT — LIRE EN PREMIER**  
> NE PAS REPRENDRE L’ARCHITECTURE MÉTIER DE L’ANCIENNE APPLICATION.  
> SENTRAJET PREMIUM N’EST PLUS UNE MARKETPLACE DE TRANSPORT.  
> LES CLIENTS NE PUBLIENT PAS DES TRAJETS DESTINÉS À ÊTRE ACCEPTÉS PAR DES CHAUFFEURS INDÉPENDANTS.  
> LES CHAUFFEURS NE CHOISISSENT NI N’ACCEPTENT LES COURSES.  
> TOUTE DEMANDE EST REÇUE, TRAITÉE, TARIFÉE, VALIDÉE ET CONFIRMÉE PAR SENTRAJET.  
> APRÈS VALIDATION ET PAIEMENT, SENTRAJET AFFECTE EN INTERNE LE VÉHICULE ET LE CHAUFFEUR.  
> LE CLIENT RÉSERVE UNE **PRESTATION SENTRAJET**, PAS UN CHAUFFEUR ET PAS UN VÉHICULE.

---

## Flux métier (unique)

```text
Client demande
  → SentraJet étudie
  → SentraJet calcule / propose (devis)
  → Client valide
  → Client paie (Wave)
  → SentraJet confirme
  → SentraJet affecte véhicule + chauffeur
  → Prestation exécutée
  → Facture
```

## Interdit (ancien modèle)

- Publication publique de trajets par les clients
- Marketplace de chauffeurs / liste de chauffeurs au client
- Chauffeur qui accepte / choisit / propose un prix
- Client qui choisit un chauffeur ou un véhicule catalogue
- Mise en concurrence / « premier qui accepte »
- Crédits chauffeur pour publier / répondre
- Invitation partenaire → chauffeurs indépendants

## Autorisé

- Simulation + demande de prestation
- Devis / paiement / confirmation SentraJet
- Dispatch interne (véhicule + chauffeur) avec anti-conflit
- Espace chauffeur = **missions assignées uniquement**
- Tarifs partenaires **uniquement** depuis espace partenaire authentifié
- CRM (prospects, devis, abandons) + facturation + journal d’historique

## Parcours client (règle d’or front)

1. Où ?  2. Quand ?  3. Combien de personnes ?  4. Combien ça coûte ?  
5. Je demande.  6. SentraJet confirme.  7. Je paie.  8. SentraJet s’occupe du reste.

Services exposés : Transfert aéroport · Voyager · Mise à disposition avec chauffeur · Groupe / Événement · Autre demande.

## Socle technique

Supabase (Auth, RLS, Realtime, Storage, Edge Functions) + moteurs métier app (`sentrajetPricing`, dispatch, business_rules, platformOps).

Design cible : **noir / or SentraJet Premium** (shell `.sj-app`), pas l’ancienne charte émeraude marketplace.

## SentraJet Operating System

- Un seul back-office / CRM maître — **pas** d’ERP offert aux partenaires
- Matricules clients `SJP-CL-*` · partenaires `SJP-PT-*` · propriétaires `SJP-OW-*`
- Compte partenaire Auth **uniquement** après certification `ACTIF`
- Parcours public partenaires : `/devenir-partenaire` (contact), jamais inscription auto

Détail : `docs/operations/SENTRAJET_OS.md`, `docs/operations/MODELE_DONNEES.md`,  
`docs/operations/PARCOURS_CLIENT_ENTREPRISE.md`, `docs/PIVOT_SENTRAJET_PREMIUM.md`.
