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
| Course en direct | Immédiat | Très rapide, expérience type Uber/Yango, dispatch par proximité | Nécessite assez de chauffeurs en ligne et une position fiable | Géolocalisation automatique, adresses Google/OSM, tarif distance, flotte prioritaire puis partenaires |
| Taxi AIBD | Immédiat ou planifié | Besoin clair, forte valeur, destination connue | Vols retardés, bagages, distance importante | AIBD prérempli, numéro de vol en planifié, catégorie véhicule et tarif transparent |
| Allo Dakar | Départ publié + recherche réseau | Prix accessible, mutualisation des places | Dépend des horaires et axes publiés | Liste live des départs ; si vide, diffusion du besoin aux chauffeurs de l’axe |
| Location de véhicule | Catalogue | Comparaison simple, valorise photos et équipements | Disponibilités, caution et état du véhicule à contrôler | Calendrier réel, fiche véhicule, paiement/caution et état des lieux numérique |
| Mise à disposition Premium | Planifié | Marge élevée, adapté entreprises/VIP | Besoin parfois complexe, durée et dépassements | Forfait horaire clair, véhicule suggéré, validation Ops seulement pour les cas hors règles |
| Groupes et cérémonies | Planifié sur devis | Panier élevé et besoins récurrents | Plusieurs véhicules, coordination et changements | Brief progressif, composition de flotte et devis validé avant paiement |

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
