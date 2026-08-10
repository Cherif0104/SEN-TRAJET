# SentraJet Premium — Parcours client (logique entreprise)

> Remplace définitivement le modèle marketplace (client publie un trajet → chauffeurs indépendants acceptent).

---

## Ce qui change

| Ancien (à abandonner) | Nouveau (SentraJet Premium) |
|-----------------------|-----------------------------|
| Client publie / cherche un trajet | Client **demande une réservation** |
| Chauffeurs particuliers s’inscrivent et acceptent | Chauffeurs = **flotte entreprise** |
| Matching automatique chauffeur ↔ demande | **Ops SentraJet** valide, devis, paiement, puis **assigne** |
| Catégories véhicules choisies par le client comme marketplace | Client choisit le **besoin** (AIBD / voyage / mise à disposition) ; SentraJet choisit le véhicule |

---

## Flux simple côté client

```text
1. Arrivée plateforme
2. Simulation (tarif client) — sans compte possible
3. Créer un compte → −10 % (tarif client uniquement)
4. Demande de réservation
5. Confirmation « prise en compte » + bouton WhatsApp
6. Paiement Wave (lien)
7. Ops traite / confirme
8. Jour J : véhicule assigné (dispatch entreprise)
9. Suivi plateforme + WhatsApp
```

**Partenaire B2B** : tarifs partenaires **uniquement** depuis l’espace `/partenaire`.  
Hors espace partenaire → toujours grille **client**.

---

## Services V1 (simples)

### 1) Transfert aéroport (AIBD)
- Localisation client reprise / saisie départ
- Destination AIBD (ou inverse)
- **Forfaits** selon passagers (grille client / partenaire déjà définie)
- N° de vol recommandé

### 2) Voyage interurbain
- Départ / destination / date / heure / pax
- Facturation **au km** (850 F client, 700 F partenaire) + minimum 30 000 F
- Aller-retour = distance × 2

### 3) Mise à disposition (pas « location » classique)
- Tarif **matinée : 50 000 FCFA** incluant jusqu’à **100 km**
- Au-delà de 100 km : facturation au km (850 client / 700 partenaire)
- Client indique zone / besoin / durée indicative

---

## Après réservation

1. Message : « Votre demande a bien été prise en compte »
2. Bouton **Continuer sur WhatsApp** (suivi commercial)
3. Suivi aussi dans `/compte/reservations`
4. Lien Wave pour paiement
5. Une fois payé → statut prêt pour dispatch

---

## Dispatch intelligent (entreprise)

- SentraJet assigne chauffeur + véhicule
- **Anti-conflit** : un véhicule déjà réservé à H0 ne reçoit pas une autre mission dans une fenêtre (ex. ±1h30, ajustable selon distance)
- Matching prioritaire sur véhicules sans conflit

---

## CRM intégré

- Historique clients
- Demandes **non finalisées** (simulation / abandon / non-paiement)
- Factures / justificatifs
- Relances possibles

---

## Écrans marketplace à ne plus mettre en avant

- `/recherche` (trajets publiés)
- `/demande` (demande ouverte aux chauffeurs)
- Inscription « Chauffeur / Pro » ouverte
- Publication de trajet chauffeur

Ces routes redirigent vers `/reserver` (simulation / réservation entreprise).
