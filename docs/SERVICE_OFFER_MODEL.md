# Modèle fonctionnel des offres SentraJet

## Principe commun

SentraJet ne doit pas présenter un formulaire identique pour tous les services. Chaque offre
correspond à un mode opérationnel différent :

1. **Immédiat** : position GPS → destination → prix → dispatch automatique → suivi.
2. **Planifié** : trajet et horaire → catégorie → prix/devis → validation et affectation.
3. **Catalogue** : recherche et filtres → fiche détaillée → disponibilité → paiement.
4. **Départ publié** : axe et date → liste des départs → réservation d’une ou plusieurs places.

## Offres

| Offre | Modèle recommandé | Avantages | Limites / risques | Solution cible |
| --- | --- | --- | --- | --- |
| Course en direct (`/course`) | Immédiat | Très rapide, expérience type Uber/Yango, dispatch par proximité | Nécessite assez de chauffeurs en ligne et une position fiable | Géolocalisation automatique, adresses Google/OSM, tarif distance, flotte prioritaire puis partenaires |
| Taxi AIBD (`/taxi-aeroport`) | Immédiat | Besoin clair, forte valeur, destination connue | Vols retardés, bagages, distance importante | AIBD prérempli, catégories Comfort+, suivi live |
| Réservation Premium (`/reserver`) | Planifié SentraJet | Marge élevée, transfert/MAD/cérémonies | Parcours long, chevauche VIP | Un seul tunnel planifié flotte propriétaire |
| Allo Dakar (`/allo-dakar`) | Départ publié + besoin | Prix accessible, mutualisation des places | Dépend des horaires et axes publiés | Liste live ; si vide, diffusion du besoin aux chauffeurs de l’axe |
| Voyager (`/interurbain`) | Marketplace lignes programmées | Comparaison d’opérateurs et places | Seed pilote, paiement Wave à industrialiser | Recherche, réservation par place, billet, portail opérateur |
| Location (`/flotte`) | Catalogue | Comparaison simple, photos et équipements | Caution et état des lieux incomplets | Calendrier réel, caution Wave, état des lieux numérique |
| Mon Chauffeur (`/mon-chauffeur`) | Abonnement + matching | Le client garde son véhicule | Paiement parfois en simulation | Cycle complet jusqu’à mission terminée |
| VIP / groupes (`/vip`) | Devis planifié | Panier élevé | Chevauche Premium et Mon Chauffeur | Brief progressif, flotte composée, devis avant paiement |

## Frontières produit (source de vérité)

1. **Immédiat** = Course + Taxi AIBD (dispatch live SentraJet).
2. **Planifié flotte SentraJet** = `/reserver` (Premium) et `/vip` (groupes/MAD complexes).
3. **Places partagées** = Allo Dakar (chauffeurs/garages Allo Dakar).
4. **Lignes programmées** = Voyager (opérateurs marketplace).
5. **Sans véhicule SentraJet** = Mon Chauffeur (véhicule client).
6. **Sans chauffeur SentraJet** = Location (véhicule seul).

Tout historique client converge vers `/compte/reservations` (« Mes trajets »).

## Règle de dispatch

Pour les courses immédiates :

1. chauffeur connecté et position récente ;
2. véhicule vérifié avec capacité suffisante ;
3. absence de mission active ;
4. priorité à la flotte SentraJet ;
5. puis véhicules partenaires gérés ;
6. puis chauffeurs indépendants validés ;
7. à priorité égale, chauffeur le plus proche du point de prise en charge.

Le client ne choisit pas un chauffeur dans une liste. Il choisit une catégorie de véhicule, puis
voit l’identité du chauffeur et l’immatriculation après l’affectation.

## Données d’adresse

L’autosuggestion combine Google Places lorsqu’une clé est disponible, puis OpenStreetMap via
Photon et Nominatim. Elle couvre les rues, quartiers et points d’intérêt référencés (mosquées,
pharmacies, commerces, établissements). Une adresse doit toujours être sélectionnée dans les
suggestions afin de disposer de coordonnées GPS vérifiables.
