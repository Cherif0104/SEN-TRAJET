# Charte tarifaire SentraJet Premium — v1.0 (16 août 2026)

Référence fonctionnelle du moteur. Implémentation :

- Catalogue DB : `pricing_tariff_versions` + `pricing_tariff_rules`
- Moteur : `src/lib/engines/tariffEngine.ts`
- Defaults (filet) : `src/lib/engines/tariffDefaults.ts`
- UI : appelle `computeSentrajetPrice` — **aucun tarif codé dans les composants**

## Trois couches (jamais mélangées)

| Couche | Qui voit | Exemple |
|--------|----------|---------|
| **public** | Client final / pro non certifié | 800 / 900 / **1 200** F/km |
| **partner** | Partenaire certifié (espace B2B) | MAD Dakar 40 000 · hors Dakar 60 000 + 600 F/km >100 km |
| **supplier** | Admin / interne uniquement | Coût d’achat transporteur |

Le client ne voit jamais partenaire, fournisseur, marge ni commission.

## Véhicule de référence

Hyundai Starex — 10 places max (extensible ensuite).

## Formule trajet public

`Prix transport = distance_routière_réelle × tarif/km(passagers)`  
Aller-retour : distance aller + retour (ou ×2 si symétrique).  
Pas d’orthodromie. Distance via OSM/Google (`/api/distance`).

## Contrôles

- Type de prestation (trajet / MAD / devis)
- Minimum court trajet configurable
- Frais externes en lignes séparées (inclus / exclu / estimé / à confirmer)
- Validation manuelle si longue distance / complexité

## Admin

Modifier un tarif en base (ex. 800 → 850) sans redéployer le front :  
mettre à jour `pricing_tariff_rules.price_per_km_fcfa` (ou créer `…_V2`).
