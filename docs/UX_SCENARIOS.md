# Scénarios UX — SEN TRAJET

Scénarios pour tester l’expérience **client**, **chauffeur** et **partenaire** avec les **comptes démo**.

---

## 1. Client — Réserver un trajet interurbain

1. Ouvrir la landing et cliquer sur **Compte démo Client** (ou utiliser la page `/comptes-test`).
2. Sur le boarding `/compte`, choisir **Trouver un trajet**.
3. Renseigner `Dakar` → `Thiès`, une date proche, lancer la recherche.
4. Dans les résultats :
   - vérifier l’affichage **type de véhicule** (icône + catégorie + places) ;
   - ouvrir un trajet : vérifier la fiche (itinéraire, véhicule, prix).
5. Cliquer sur **Réserver maintenant**, compléter la réservation, puis vérifier que :
   - la réservation apparaît dans **Mes réservations** ;
   - le trajet n’apparaît plus comme disponible si complet (selon le nombre de places).

---

## 2. Client — Créer une demande et choisir une proposition

1. Connecté en client test, cliquer **Publier une demande**.
2. Remplir : départ, destination, date, nombre de passagers, valider.
3. Se connecter en **chauffeur test** dans un autre onglet, aller sur `/chauffeur/demandes`.
4. Répondre à la demande avec **une proposition** (prix + véhicule).
5. Revenir côté client : dans **Mes demandes**, ouvrir la demande, choisir la proposition.
6. Vérifier que la réservation est créée et que la proposition est marquée **Acceptée**.

---

## 3. Chauffeur — Publier un trajet et voir ses réservations

1. Se connecter en **chauffeur test**.
2. Sur le boarding `/chauffeur`, cliquer **Publier un trajet**.
3. Renseigner le trajet (villes, date/heure, places, prix, véhicule) puis publier.
4. En tant que **client test**, rechercher ce trajet et le réserver.
5. Revenir côté chauffeur et ouvrir **Mes réservations** :
   - vérifier l’apparition de la réservation ;
   - accéder à la messagerie depuis la réservation.

---

## 4. Partenaire — Suivre chauffeurs et commissions

1. Se connecter en **partenaire test**.
2. Sur `/partenaire` :
   - vérifier les indicateurs (nombre de chauffeurs, commissions en attente) ;
   - copier le **lien d’invitation**.
3. Simuler une inscription chauffeur via ce lien (nouveau navigateur ou session).
4. Une fois le chauffeur créé et actif, vérifier que :
   - il apparaît dans **Mes chauffeurs** ;
   - les recharges de crédits ou trajets complétés génèrent des lignes dans **Commissions** (si la logique est en place).

---

## 5. Accessibilité & lisibilité rapide (mobile)

Pour chaque scénario ci‑dessus, sur mobile :

- vérifier que les **boutons principaux** sont visibles sans scroller inutilement ;
- s’assurer que les textes importants sont lisibles (contraste suffisant, taille de police) ;
- tester l’utilisation **au doigt** (pas de cibles trop petites).

