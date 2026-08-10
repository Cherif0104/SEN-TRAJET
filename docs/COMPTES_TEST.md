# Comptes de test — SentraJet Premium

## Connexion en un clic

Page **[/comptes-test](/comptes-test)** : Client, Admin, Super Admin, Partenaire B2B, Chauffeur flotte, Propriétaire.

- Disponible en **local** et sur **Preview Vercel**
- Désactivé en **production** sauf `ENABLE_TEST_ACCOUNTS=true`
- Secret optionnel : header `x-test-login-secret` = `TEST_LOGIN_SECRET`

Lien aussi depuis **Connexion** et le **pied de page**.

Mot de passe (serveur) : `TEST_ACCOUNTS_PASSWORD` (défaut `TestPass123!`).

Emails par défaut :

| Rôle | Email |
|------|--------|
| Client | `client@test.sentrajet.sn` |
| Chauffeur flotte | `chauffeur@test.sentrajet.sn` |
| Partenaire | `partenaire@test.sentrajet.sn` |
| Admin | `admin@test.sentrajet.sn` |
| Super Admin | `superadmin@test.sentrajet.sn` |
| Propriétaire | `proprietaire@test.sentrajet.sn` |

API : `POST /api/test-login` body `{ "role": "client" }` → `{ email, password, redirect }`.

## Parcours QA recommandé

1. **Client** → `/reserver` (adresses Maps + devis)
2. **Admin** → `/admin/demandes` (pipeline)
3. **Partenaire** → `/partenaire` (B2B)
4. **Chauffeur** → `/chauffeur/missions` (pas de marketplace)

## Prérequis

- `SUPABASE_SERVICE_ROLE_KEY` configurée (création / mise à jour des users Auth)
