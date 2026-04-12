# Comptes de test — SEN TRAJET

## Connexion en un clic (recommandé)

Page **[/comptes-test](/comptes-test)** : boutons **Tester comme Client**, **Chauffeur**, **Partenaire**, **Admin**, **Super Admin**.
Un clic crée le compte (si besoin), met le bon rôle dans `profiles`, puis connecte automatiquement avec mot de passe.

- Lien depuis la page **Connexion** : « Tester la plateforme avec un compte démo (1 clic) ».
- Lien dans le **pied de page** : « Comptes démo ».

Variable d’environnement optionnelle (serveur) : `TEST_ACCOUNTS_PASSWORD` (défaut : `TestPass123!`).
Emails par défaut :

- `client@test.sentrajet.sn` (`TEST_CLIENT_EMAIL`)
- `chauffeur@test.sentrajet.sn` (`TEST_CHAUFFEUR_EMAIL`)
- `partenaire@test.sentrajet.sn` (`TEST_PARTENAIRE_EMAIL`)
- `admin@test.sentrajet.sn` (`TEST_ADMIN_EMAIL`)
- `superadmin@test.sentrajet.sn` (`TEST_SUPER_ADMIN_EMAIL`)

---

## Création manuelle via l’inscription

- **Client** : Inscription → rôle « Passager » → email + mot de passe.
- **Chauffeur** : Inscription → rôle « Chauffeur » → compléter profil + véhicule(s) + documents. Option : utiliser un **code parrain** pour rattacher à un partenaire.
- **Partenaire** : Inscription → rôle « Partenaire » → après connexion, compléter l’onboarding (nom structure, contact) → accès à l’espace partenaire et au lien d’invitation.

## 2. Rôles Admin / Super Admin

Les rôles **admin** et **super_admin** peuvent être attribués en base (table `profiles`, colonne `role`) ou via la page de comptes test.
Pour un compte existant :

1. Supabase Dashboard → Table Editor → `profiles`.
2. Trouver la ligne du compte (par `id` = `auth.users.id`).
3. Mettre `role` à `admin`.

Ou exécuter en SQL (remplacer `'USER_UUID'` par l’id du user) :

```sql
update public.profiles set role = 'admin' where id = 'USER_UUID';
update public.profiles set role = 'super_admin' where id = 'USER_UUID';
```

## 3. Scénario de test rapide

1. **Chauffeur** : se connecter → Publier un trajet (Dakar → Thiès, date du jour, heure, 4 places, prix).
2. **Client** : ouvrir la plateforme (navigation privée ou autre navigateur) → Recherche « Dakar » → « Thiès » + date → voir le trajet → Réserver.
3. **Chauffeur** : voir la réservation dans « Mes réservations » (ou équivalent).
4. Refaire 4 réservations sur le même trajet (4 clients ou 4 places) → le trajet doit devenir **complet** (plus de place, plus proposé en recherche réservable).

## 4. Comptes pré-créés (optionnel)

Pour des comptes de test pré-créés (ex. `client@test.sentrajet.sn`, `chauffeur@test.sentrajet.sn`), utiliser Supabase Auth → Users → « Add user » (email + mot de passe), puis en SQL insérer ou mettre à jour les lignes dans `profiles` avec le bon `role` et les infos nécessaires.
