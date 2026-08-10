# SENTRAJET PREMIUM — Conditions générales de vente & règles de réservation

> **Statut** : projet opérationnel / brouillon product & legal.  
> **À faire relire et valider juridiquement** avant toute publication définitive.  
> Au Sénégal, les ventes/prestations à distance et les contrats électroniques sont notamment encadrés par la **loi n°2021-25** sur les prix et la protection du consommateur et la **loi n°2008-08** sur les transactions électroniques.

Version document : 2026-08-10  
Source produit : pivot SentraJet Premium + supports tarifaires + prototype front.

---

## 1. Présentation

**SENTRAJET PREMIUM** est un service sénégalais de **transport privé avec chauffeur**, proposant notamment :

- transferts aéroportuaires ;
- déplacements professionnels ;
- trajets interurbains ;
- mise à disposition avec chauffeur ;
- transport de groupes ;
- événements et cérémonies ;
- tourisme et excursions ;
- transport de délégations ;
- services VIP et conciergerie.

SentraJet peut travailler directement avec des particuliers, entreprises, institutions, ONG, hôtels, agences de voyage et partenaires commerciaux.

Contacts :
- WhatsApp réservation : [+221 78 832 40 69](https://wa.me/221788324069)
- Paiement Wave (Impulcia Afrique) : https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/
- TikTok : https://www.tiktok.com/@sen_trajet
- Facebook : https://www.facebook.com/share/1LUmVvCxxC/

---

## 2. Les espaces de la plateforme

### 2.1 Espace Client
Créer un profil ; demander une réservation ; choisir trajet ; indiquer passagers et besoins ; consulter tarif ; payer ; recevoir confirmation ; consulter chauffeur ; suivre / historique ; justificatifs.

### 2.2 Espace Chauffeur
Consulter missions assignées ; prendre en charge ; infos client et lieu ; signaler arrivée ; démarrer / terminer ; incident ; historique.

### 2.3 Espace Partenaire
Demandes de transport ; réserver pour ses clients ; tarifs partenaires ; suivi ; factures ; historique ; mise à disposition ; multi-demandes.

### 2.4 Espace Propriétaire / Investisseur (Vehicle Partner)
Proposer un véhicule à SentraJet via **contrat d’exploitation**.  
Exemple de condition d’entrée : **Hyundai Starex — contrat d’exploitation à partir de 500 000 FCFA/mois** (modalités contractuelles ; **pas un rendement garanti**).

SentraJet peut prendre en charge selon contrat : exploitation commerciale, missions, chauffeurs, planification, entretien, suivi ops, relation client, reporting.  
Assurance, carburant, réparations lourdes, pneus, taxes, immobilisation et responsabilité : **à préciser au contrat**.

WhatsApp propriétaires : https://wa.me/221788324069

---

## 3. Processus complet d’une réservation

1. **Demande** — départ, destination, date, heure, pax, type, téléphone, infos, n° de vol (AIBD).  
2. **Calcul du tarif** — segment → prestation → pax → distance → véhicule → options → tarif (forfait / km / devis / partenaire).  
3. **Validation** — Demande → Devis/Tarif → Validation client → Paiement → Confirmation → Affectation.  
   Une réservation n’est **confirmée** qu’après validation selon les règles SentraJet.  
4. **Paiement** — Wave ; enregistrer montant, réf. réservation, réf. transaction, date, moyen, statut.  
5. **Affectation** — chauffeur, véhicule, capacité, dispo, localisation, catégorie.  
6. **Prise en charge** — En route → Arrivé → Client pris en charge → En cours → Terminée.  
7. **Clôture** — montant final, frais éventuels, facture/reçu, évaluation, clôture chauffeur.

---

## 4. Statuts d’une réservation (Supabase)

| Code | Libellé |
|------|---------|
| `brouillon` | Brouillon |
| `demande` | Demande |
| `en_attente_de_confirmation` | En attente de confirmation |
| `en_attente_de_paiement` | En attente de paiement |
| `payee` | Payée |
| `confirmee` | Confirmée |
| `chauffeur_a_assigner` | Chauffeur à assigner |
| `chauffeur_assigne` | Chauffeur assigné |
| `chauffeur_en_route` | Chauffeur en route |
| `chauffeur_arrive` | Chauffeur arrivé |
| `client_pris_en_charge` | Client pris en charge |
| `en_cours` | En cours |
| `terminee` | Terminée |
| `annulee_client` | Annulée client |
| `annulee_sentrajet` | Annulée SentraJet |
| `no_show` | No-show |
| `incident` | Incident |
| `remboursement_en_cours` | Remboursement en cours |
| `remboursee` | Remboursée |

Chaque changement doit être journalisé (`booking_status_history`).

---

## 5. Règles d’annulation

| Délai avant prise en charge | Frais |
|-----------------------------|-------|
| Plus de 6 heures | 0 % |
| Entre 4 et 6 heures | 30 % du montant |
| Moins de 2 heures | 50 % du montant |
| Chauffeur déjà arrivé | Prestation éventuellement due (selon conditions) |

### Point ouvert (à décider)
La tranche **entre 2 h et 4 h** n’est **pas** définie dans les supports.  
**Ne pas inventer** : paramétrer `cancellation_fee_2h_to_4h_percent` une fois la décision métier prise (valeur `null` = non applicable / décision pending).

### No-show
Statut `no_show` avec : heure arrivée chauffeur, durée d’attente, tentatives de contact, heure de clôture, montant éventuellement dû.

---

## 6. Attente du client

- **30 minutes gratuites**
- Au-delà : **2 500 FCFA / tranche de 30 minutes**

| Attente | Frais |
|---------|-------|
| 0–30 min | 0 |
| 30–60 min | 2 500 |
| 60–90 min | 5 000 |
| 90–120 min | 7 500 |
| … | +2 500 / tranche |

Aéroport : règle spécifique retard de vol **à paramétrer** (option `airport_wait_flight_delay_rule`).

---

## 7. Grille tarifaire — client direct

### Transfert Dakar ⇄ AIBD

| Passagers | Tarif |
|-----------|-------|
| 1–2 | 25 000 FCFA |
| 3–5 | 30 000 FCFA |
| 6–8 | 40 000 FCFA |
| 9–11 | 50 000 FCFA |

### Récupération AIBD + retour

| Passagers | Tarif |
|-----------|-------|
| 1–3 | 35 000 FCFA |
| 4–5 | 40 000 FCFA |
| 6–8 | 50 000 FCFA |
| 9–11 | 60 000 FCFA |

---

## 8. Trajets interurbains (> 50 km)

- **850 FCFA / km** (client)
- **Minimum de facturation : 30 000 FCFA**
- Calcul sur distance **aller** ; aller-retour = distance × 2

Exemples (aller, 850 F/km) : 60→51 000 · 80→68 000 · 100→85 000 · 150→127 500 · 200→170 000 · 250→212 500 · 300→255 000 · 400→340 000 · 450→382 500.

---

## 9. Tarification partenaire B2B validé

### AIBD (net partenaire)

| Passagers | Tarif |
|-----------|-------|
| 1–2 | 20 000 F |
| 3–5 | 25 000 F |
| 6–8 | 30 000 F |
| 9–11 | 40 000 F |

### Interurbain
- **700 FCFA / km**
- **Minimum : 30 000 FCFA**

Le partenaire peut appliquer sa propre marge commerciale selon modalités convenues.  
Grilles **paramétrables** dans l’administration (y compris par partenaire).

---

## 10. Groupes

Facturation **par véhicule** :  
ex. 20 pers. → 2 minivans ; 30 → 3 ; 40 → 4.  
Calcul : passagers → capacité véhicule → nombre de véhicules.

---

## 11. Conditions particulières de réservation

Obligatoire : identité, téléphone, date, heure, départ, destination, pax, type, infos mission.  
AIBD : n° de vol recommandé, heure d’arrivée, nom passager, bagages.  
Modification importante → réévaluation tarifaire.  
Informations inexactes → retard ou coût supplémentaire possible.

---

## 12. Conditions de transport

**Client** : respect chauffeur/véhicule, pax déclaré, pas d’objets interdits, pas de dégradation, sécurité.  
**Chauffeur** : courtoisie, ponctualité, discrétion, conduite pro, confidentialité, entretien, consignes SentraJet.

---

## 13. Objets oubliés

1. Signalement chauffeur  
2. Enregistrement  
3. Contact client  
4. Restitution (frais éventuels facturables)

---

## 14. Incident / retard / force majeure

Embouteillages, accidents, manifestations, routes bloquées, intempéries, panne, restrictions, cas de force majeure.  
SentraJet met en œuvre les moyens raisonnables de continuité.  
Le chauffeur peut déclarer un incident opérationnel dans l’app.

---

## 15. Réclamations

Délai de réclamation : **à définir** (`complaint_deadline_hours`).  
Parcours : Réservation → Réclamation → Motif → Description → Pièce jointe → Traitement → Réponse → Clôture.

---

## 16. Données personnelles

Collecte : identité, téléphone, email, réservations, trajets, données de paiement nécessaires, données ops.  
Traitement conforme au cadre sénégalais (données personnelles + transactions électroniques).  
Prévoir : politique de confidentialité, consentements, gestion des comptes, journalisation, droits d’accès.

---

## 17. Propriétaires / investisseurs

Produit : **SENTRAJET VEHICLE PARTNER**  
Slogan : « Votre véhicule travaille. Nous nous occupons du reste. »  
Condition : à partir de **500 000 FCFA/mois**, selon véhicule et contrat — **ne pas présenter comme rendement garanti**.

---

## 18. Paramétrage obligatoire (Control Center)

Aucune règle importante en dur. L’admin doit pouvoir modifier :

`tarif` · `seuil` · `pourcentage` · `délai` · `frais` · `statut` · `condition` · `exception`

Voir [`ARCHITECTURE_5_MOTEURS.md`](./ARCHITECTURE_5_MOTEURS.md) et [`OPEN_DECISIONS.md`](./OPEN_DECISIONS.md).
