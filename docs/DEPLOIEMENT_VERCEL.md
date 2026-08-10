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
- `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement, si besoin)
- clés Wave / autres API métier selon les routes actives

## 5) Preview actuelle (branche pivot)

Voir le commentaire Vercel sur la PR #1 pour l’URL Preview à jour.
