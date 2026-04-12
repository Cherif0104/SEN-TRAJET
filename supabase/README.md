# Supabase — SEN TRAJET

Ce dépôt cible une **base Supabase qui peut être partagée** avec d’autres produits (tables `organisations`, `incubes`, `staff_users`, etc.). Les fonctionnalités **SEN TRAJET** vivent surtout dans : `trips`, `trip_locations`, `profiles`, `vehicles`, `driver_documents`, `trip_requests`, `proposals`, `bookings`, `wallets`, `credit_packages`, `transactions`, `payment_intents`, `reviews`, `notifications`, `partners`, `partner_commissions`, `messages`.

Pour la prod, l’idéal reste **un projet Supabase dédié** à SEN TRAJET afin d’isoler RLS, backups et advisors.

---

## 1) Variables d’environnement

Copier `.env.example` vers `.env.local` et renseigner :

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique (recommandé) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ancienne clé anon (transition uniquement) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement** (API routes, webhooks) |

Ne jamais exposer la service role côté navigateur.

---

## 2) Migrations : deux sources de vérité

- **Sur le projet Supabase (MCP / Dashboard)** l’historique réel est dans `schema_migrations` (noms du type `sen_trajet_*`, `schema_core_tables`, etc.).
- **Dans ce repo**, le dossier `supabase/migrations/` sert à **reconstruire** ou documenter le schéma SEN TRAJET.

Ordre conseillé pour une **nouvelle** base SEN TRAJET seule (sans les tables « autre app ») : exécuter les fichiers `20260312_*` puis `20260315_*` puis `20260316_*` puis `20260317_*` dans l’ordre lexical des noms de fichiers.

Fichiers `20260312_000004` à `20260312_000007` : **commentaires de résumé seulement** — le DDL correspondant a été appliqué sur la prod sous d’autres noms (`sen_trajet_matching_system`, `sen_trajet_credit_system`, etc.). Pour un clone à partir de zéro, utiliser **Supabase CLI** `db pull` depuis le projet réel ou réappliquer via le MCP.

### Migrations récemment alignées (avril 2026)

Sur l’instance connectée au MCP, les migrations suivantes ont été ajoutées pour rattraper le front :

- `sen_trajet_proposals_counter_offer` — colonnes négociation sur `proposals`
- `sen_trajet_messages_booking` — table `messages` + RLS
- `sen_trajet_storage_documents_bucket` — bucket Storage `documents` + politiques
- `sen_trajet_messages_realtime_publication` — `messages` dans `supabase_realtime`

---

## 3) Colonnes attendues par le front (`trips`)

La recherche lit notamment : `id`, `driver_name`, `rating`, `reviews`, `departure_time`, `arrival_time`, `from_city`, `to_city`, `distance_km`, `duration_minutes`, `vehicle_name`, `vehicle_category`, `available_seats`, `total_seats`, `price_fcfa`, `status`, `trip_type`.

Si l’URL ou la clé publique Supabase est absente ou invalide, `searchTrips` dans `src/lib/trips.ts` retourne une **liste vide** (pas de données de démo injectées automatiquement).

---

## 4) Stockage

- Bucket **`documents`** (public en lecture) pour permis / carte grise / assurance / pièce d’identité — chemins du type `{user_id}/...`.
- Autres buckets (`toolbox-documents`, `module-assets`) relèvent de l’autre application sur la même instance.

---

## 5) Sécurité (advisors Supabase)

À traiter côté Dashboard / SQL :

- Tables **non SEN TRAJET** avec RLS activé mais **sans policies** (ex. `invitation_codes`, `assignations`, …) — soit policies explicites, soit projet séparé.
- Policy **`notifications` INSERT** trop permissive signalée par le linter — à resserrer (insert via service role ou fonction `security definer` contrôlée).
- Fonctions Postgres : ajouter `SET search_path = public` (ou schéma fixe) sur les fonctions métier (`debit_credits`, `credit_recharge`, etc.).
- Auth : activer la protection des mots de passe compromis (Have I Been Pwned) dans les paramètres Supabase.

Liens utiles : [Database linter](https://supabase.com/docs/guides/database/database-linter), [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

---

## 6) Realtime

Vérifier que les tables concernées sont dans la publication `supabase_realtime` : au minimum `trip_locations` et `messages` pour le produit SEN TRAJET.
