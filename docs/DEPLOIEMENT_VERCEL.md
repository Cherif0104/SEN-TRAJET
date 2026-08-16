# Déploiement Vercel — SentraJet Premium

## 1) Dépôt GitHub

- Repository : `Cherif0104/SEN-TRAJET`
- Branche de production : `main`

## 2) Déploiement (chemin officiel)

**Intégration GitHub native Vercel** sur le projet `sen-trajet` :

- chaque push / PR crée une Preview automatiquement ;
- le merge sur `main` déploie en production.

Plus besoin du workflow Actions CLI (qui provoquait des emails d’échec quand `VERCEL_TOKEN` était absent).

## 3) CI GitHub Actions

Le workflow `.github/workflows/vercel-deploy.yml` (renommé logiquement « CI ») fait uniquement :

- `npm ci`
- `npm run lint`
- `npm run build`

Il ne déploie plus. Cela évite les faux échecs / emails « missing token ».

## 4) Variables d’environnement Vercel

Dans le dashboard Vercel du projet, configurer au minimum :

- `NEXT_PUBLIC_SUPABASE_URL` → `https://ootvzknyhkhxroadnclh.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (serveur — comptes démo, ops)
- `WAVE_API_KEY` — checkout Wave API live (sans clé = mode simulation)
- `GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_SERVER_KEY` — Places + Distance Matrix (sans clé = OSM Photon/OSRM)
- Preview QA : `ENABLE_TEST_ACCOUNTS=true` (optionnel ; Preview autorise déjà `/comptes-test`)

## 5) Protection Preview (SSO Vercel)

Si les tests API/UI Preview renvoient **401 Protected deployment** :

1. Vercel → projet `sen-trajet` → **Settings** → **Deployment Protection**
2. Désactiver **Vercel Authentication** sur les Preview, **ou**
3. Ajouter les comptes équipe / partager un bypass

Sans cela, curl et agents externes ne peuvent pas tester la Preview.

## 6) Preview actuelle (branche pivot)

Voir le commentaire Vercel sur la PR #1 pour l’URL Preview à jour.
