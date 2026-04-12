# Audit technique SEN TRAJET (nettoyage / corrections)

Date : mars 2026 — synthèse des problèmes détectés et des correctifs appliqués.

## Build & qualité

| Problème | Correctif |
|----------|-----------|
| **Aucun `.eslintrc.json`** → `next lint` ouvrait l’assistant interactif | Ajout de `.eslintrc.json` avec `extends: "next/core-web-vitals"`. |
| **Erreur TypeScript** : `VehicleBadge` attendait `seats: number`, les trajets exposent `"3/4"` (string) | `VehicleBadge` accepte `number \| string` + libellé adapté. |
| **Règles des hooks** dans `Map.tsx` : `useMemo` après un `return` conditionnel | Extraction `OpenStreetMapEmbed` (hooks toujours au même ordre). |
| **`GoogleMap.tsx`** : dépendances `useEffect` invalides (`JSON.stringify` dans le tableau) | `useMemo` pour `points`, dépendances `[scriptReady, fromCity, toCity, zoom, points, markers]`. |
| **Conflit de types Google Maps** (`Map` vs ES6) | `mapRef` en `unknown`, marqueurs avec type minimal `setMap`. |
| **`bookings.ts`** : cast Supabase incorrect avec TS strict | Type intermédiaire `BookingRow` + `as unknown as BookingRow[]`. |
| **Prerender Next 14** : `useSearchParams()` sans Suspense sur `/connexion` et `/inscription` | Composants internes + `<Suspense fallback={…}>` sur l’export default. |

## Auth & navigation

| Problème | Correctif (déjà en place ou renforcé) |
|----------|----------------------------------------|
| Connexion email / SMS renvoyait vers `/` sans tenir compte du rôle | `resolvePostLoginRedirect()` + `window.location.replace(target)` après lecture du profil. |
| Comptes test : magic link peu fiable | API renvoie `email` + `password` + `redirect`, client fait `signInWithPassword` puis navigation forcée. |

## Dépendances

- **`@types/google.maps`** ajouté en dev pour le typage des cartes.

## Recommandations suivantes

1. **`npm audit`** : plusieurs vulnérabilités signalées (dépendances) — à traiter selon politique projet (`npm audit fix` ou mises à jour ciblées).
2. **`useAuth`** : en cas d’échec `fetchProfile`, prévoir un état d’erreur ou un retry pour éviter blocage prolongé sur « Redirection… » si la ligne `profiles` manque.
3. **Middleware** : vérifier cohérence avec les gardes `layout` (chauffeur / partenaire) pour éviter doubles redirections.
4. **Variables d’environnement** : documenter `TEST_*`, `SUPABASE_*`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` dans un `README` ou `.env.example` (sans secrets).
