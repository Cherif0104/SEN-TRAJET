# Deploiement continu Vercel

## 1) Depot GitHub

- Repository cible: `Cherif0104/SEN-TRAJET`
- Branche de production: `main`

## 2) Secrets GitHub Actions a configurer

Dans **Settings > Secrets and variables > Actions**, ajouter:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 3) Workflow active

Le workflow `.github/workflows/vercel-deploy.yml`:

- fait `lint`
- cree un build Vercel
- deploie en `preview` sur Pull Request
- deploie en `production` sur push de `main`

## 4) Variables d'environnement Vercel

Dans le dashboard Vercel du projet, configurer au minimum:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (si necessaire cote server/API)
- autres cles API metier selon les routes actives

## 5) Recommandation

Brancher egalement l'integration GitHub native de Vercel pour avoir:

- preview URLs automatiques par PR
- historique des deploiements dans Vercel
- rollback simplifie
