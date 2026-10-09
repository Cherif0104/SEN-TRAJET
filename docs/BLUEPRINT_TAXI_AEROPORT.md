# Blueprint — SentraJet Taxi Aéroport Sénégal

## Positionnement

Application mobile spécialisée dans les trajets privés entre l’Aéroport International Blaise Diagne
(AIBD) et Dakar ou sa périphérie. Le lancement ne présente pas le catalogue historique SentraJet.
L’objectif est une promesse simple : renseigner une adresse, voir un prix, obtenir un chauffeur et
suivre son arrivée.

Le mode `Course privée` et le futur mode `Place partagée` sont deux produits distincts. Un client ne
doit jamais être placé en covoiturage sans l’avoir explicitement choisi.

## Parcours client MVP

1. Écran d’accueil : `Partir maintenant` ou `Planifier`.
2. Sens du trajet : vers AIBD ou depuis AIBD.
3. Géolocalisation par défaut ou adresse recherchée avec autosuggestion.
4. Calcul routier, durée estimée et prix.
5. Choix `Comfort`, `Comfort Plus` ou `VIP`.
6. Nombre de passagers, bagages et numéro de vol facultatif.
7. Connexion ou création de compte avant confirmation.
8. Paiement Wave.
9. Recherche de chauffeur.
10. Chauffeur affecté, carte temps réel, ETA et contact masqué.
11. Course en cours, arrivée, reçu et notation.

## Parcours chauffeur MVP

1. Inscription et dépôt permis, identité, assurance et véhicule.
2. Validation Ops obligatoire.
3. Écran mobile `Hors ligne / En ligne`.
4. Réception d’une proposition avec distance d’approche, trajet, classe et revenu.
5. Acceptation avec délai court ; refus sans blocage de l’application.
6. Navigation vers le client et statuts `En route`, `Arrivé`, `Passager à bord`, `Terminé`.
7. Historique, revenus et incidents.

## Console opérations

- file des courses sans chauffeur ;
- carte des chauffeurs en ligne ;
- validation KYC chauffeur/véhicule ;
- réaffectation et annulation ;
- surveillance paiements, remboursements et incidents ;
- paramètres des rayons, délais, classes et tarifs.

## Machine d’état cible

`draft → quoted → payment_pending → searching → offered → assigned → driver_en_route →
driver_arrived → passenger_on_board → completed`

Sorties : `cancelled`, `expired`, `no_driver`, `payment_failed`, `refunded`.

Chaque transition est validée côté serveur, horodatée et idempotente.

## Dispatch cible

1. Filtrer les chauffeurs validés, en ligne, libres et compatibles avec la classe.
2. Classer par priorité flotte SentraJet, ETA d’approche, taux d’acceptation et temps d’inactivité.
3. Proposer séquentiellement ou par petite vague avec expiration.
4. Étendre progressivement le rayon.
5. Affecter atomiquement le premier chauffeur qui accepte.
6. Basculer vers les Ops si aucun chauffeur ne répond.

Le lot initial livré dans l’interface prépare ce parcours mais le moteur actuel du dépôt reste manuel :
l’acceptation chauffeur, l’affectation atomique et le tracking fréquent doivent être livrés côté
serveur avant d’annoncer un vrai service « live ».

## Place partagée — lot ultérieur

- réservation par siège ;
- fenêtre de départ explicite ;
- regroupement par corridor et horaire de vol ;
- détour maximal configurable ;
- capacité et bagages garantis ;
- prix par place ;
- départ confirmé seulement selon les règles commerciales affichées.

## Architecture recommandée

Le dépôt doit évoluer progressivement vers des applications configurées sur un socle commun :

- `apps/airport-taxi`
- `apps/urban-taxi`
- `apps/allo-dakar`
- packages partagés : UI, auth, cartographie, tarification, paiement, dispatch et observabilité.

Les branches servent à développer et relire les changements. Elles ne doivent pas devenir trois
copies permanentes de l’application : cela dupliquerait les correctifs de sécurité et les évolutions
du moteur métier.
