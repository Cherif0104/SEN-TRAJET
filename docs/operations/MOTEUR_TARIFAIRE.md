# Moteur tarifaire SentraJet Premium

## Distance

1. API Google Distance Matrix (routière) si clé disponible  
2. Cache `region_distances`  
3. Seed Dakar → villes (Thiès 67, Mbour 90, …)  
4. Orthodromie × 1,35  

Arrondi : **kilomètre supérieur**.

## Public

| Cas | Règle |
|-----|--------|
| AIBD | dès 20 000 (grille pax) |
| ≤ 45 km | 20 000 |
| > 45 km | 450 F/km ≤5 pax · 600 F/km ≤10 |
| MAD | 50 000 / 10 h Dakar |
| Cérémonie | dès 45 000 (souvent devis) |
| Longue distance | devis (+ indication km) |
| Attente | 30 min offertes puis 2 500 / 30 min (hors MAD) |

## B2B

Grille AIBD / AIBD+retour + interurbain 700 F/km min 30 000, AR = ×2.

## UX simulation

`/reserver` : service → trajet (pax/valises +/−, modes) → détail prix → validation → compte → demande.
