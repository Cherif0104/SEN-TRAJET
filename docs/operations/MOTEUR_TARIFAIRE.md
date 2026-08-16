# Moteur tarifaire SentraJet Premium

## Distance (personnalisée, jamais simulée)

1. Le client choisit **prise en charge** et **arrivée** via suggestions d’adresse  
   (Google Places si clé, sinon OpenStreetMap Photon / Nominatim).  
2. Calcul d’itinéraire routier réel : Google Distance Matrix **ou** OSRM (coords GPS).  
3. Cache `region_distances` uniquement après un calcul GPS réussi.  
4. **Interdit** pour tarifer : seed villes, orthodromie, km « par défaut ».  

Arrondi : **kilomètre supérieur**. Un trajet plus long = tarif plus élevé.

## Public

| Cas | Règle |
|-----|--------|
| AIBD court | forfait dès 20 000 (grille pax) |
| AIBD long (km > forfait) | **au km** selon pax |
| ≤ 45 km (aller simple) | min 20 000 si km×tarif < 20 000 |
| Trajet / longue distance | **800 / 900 / 1000 F/km** |
| Passagers | 1–4 → 800 · 5–7 → 900 · 8–10 → 1000 · >10 devis |
| Aller-retour | distance aller **× 2** |
| MAD | 50 000 / 10 h Dakar |
| Cérémonie | dès 45 000 (souvent devis) |
| Attente | 30 min offertes puis 2 500 / 30 min (hors MAD) |

## B2B

Grille AIBD / AIBD+retour + interurbain 700 F/km min 30 000, AR = ×2.

## UX simulation

`/reserver` : service → trajet (adresses Maps + pax/valises +/−, modes) → détail prix → validation → compte → demande.
