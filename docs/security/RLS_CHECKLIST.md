# Checklist RLS (Supabase) — SEN TRAJET

Ce projet exécute beaucoup de requêtes depuis le navigateur (via `@supabase/supabase-js`). **La sécurité dépend donc principalement des politiques RLS** sur les tables.

## Principes attendus
- **RLS activée sur toutes les tables “métier”** (lecture/écriture).
- **Aucune politique `USING (true)` / `WITH CHECK (true)`** sur des tables sensibles.
- **Éviter les `select *` côté client** quand des colonnes sensibles existent (téléphone, ids, metadata).
- **Toujours lier les lignes à `auth.uid()`** (client/driver/partner/admin) avec `USING` et `WITH CHECK`.
- **Admin via service role uniquement** (Edge/API Next côté serveur) ou via un rôle/claim strictement vérifié.

## Tables clés et règles minimales

### `profiles`
- **SELECT**: un utilisateur peut lire *son* profil (`id = auth.uid()`).
- **UPDATE**: un utilisateur peut modifier *son* profil (colonnes autorisées uniquement si possible via vues/colonnes séparées).
- **INSERT**: généralement via trigger après signup (ou contrôlé).
- **Sensible**: éviter qu’un utilisateur lise le `phone`/notes de tous.

### `trips`
- **SELECT**: public (si vous assumez que les trajets sont visibles), mais **filtrer `status = 'active'`** côté policy si besoin.
- **INSERT**: uniquement `driver_id = auth.uid()` et rôle chauffeur (si vous encodez le rôle).
- **UPDATE/DELETE**: uniquement le chauffeur propriétaire (ou admin via service role).

### `bookings`
- **SELECT**: seulement si `client_id = auth.uid()` OU `driver_id = auth.uid()` (et éventuellement admin).
- **INSERT**: seulement `client_id = auth.uid()`.
- **UPDATE**: transitions limitées, mais au minimum **uniquement client/driver liés** à la ligne.

### `trip_requests`
- **SELECT (client)**: `client_id = auth.uid()`.
- **SELECT (driver feed)**: si vous exposez les demandes ouvertes aux chauffeurs, limiter:
  - uniquement `status = 'open'`
  - uniquement à des champs non sensibles
  - idéalement via **vue sécurisée** (ex: `trip_requests_public`) ou RPC.
- **INSERT**: seulement `client_id = auth.uid()`.
- **UPDATE**: seulement le client pour annuler (ou système pour matcher/expirer).

### `driver_match_notifications`
- **SELECT/INSERT**: uniquement `driver_id = auth.uid()`.

### `vehicles`
- **SELECT/INSERT/UPDATE/DELETE**: uniquement `driver_id = auth.uid()` (ou partner si flotte partagée, mais alors règles explicites).

### `driver_documents` / `driver_document_files`
- **SELECT**: uniquement `driver_id = auth.uid()` (et admin via service role).
- **INSERT/UPDATE**: uniquement `driver_id = auth.uid()`.
- **Storage**: bucket privé + policies Storage alignées.

### `wallets`
- **SELECT**: uniquement `driver_id = auth.uid()`.
- **INSERT/UPDATE**: **interdit côté client** (service role / RPC seulement).

### `transactions`
- **SELECT**: uniquement les transactions dont le wallet appartient à `auth.uid()` (jointure via `wallet_id`).
- **INSERT**: **interdit côté client** (service role / RPC seulement).

### `credit_packages`
- **SELECT**: public (packs visibles).
- **INSERT/UPDATE**: admin/service role seulement.

### `payment_intents`
- **SELECT**: uniquement `driver_id = auth.uid()` (si vous les affichez côté chauffeur).
- **INSERT**: possible côté client (avec RLS stricte), ou mieux via API serveur.
- **UPDATE**: service role seulement (webhook Wave).

### `partners`
- **SELECT**: uniquement `user_id = auth.uid()` + éventuellement rôles partner_manager/operator liés.
- **INSERT/UPDATE**: uniquement le propriétaire (`user_id = auth.uid()`) ou service role.

### `partner_commissions`
- **SELECT**: uniquement `partner_id` appartenant à l’utilisateur (ou rôle partner_*).
- **INSERT/UPDATE**: service role seulement (webhook/payout).

## Tables / RPC mentionnées dans le code
- RPC: `sync_trip_available_seats`, `credit_recharge` (doivent être `SECURITY DEFINER` si besoin et verrouillées).
- Tables: `region_distances` (API serveur), `commission_configs` (admin), etc.

## Vérifs rapides (manuelles)
- Avec un user A, tenter via l’UI/devtools de lire/modifier des lignes du user B → doit échouer.
- Avec un user “client”, tenter d’insérer un `trip` → doit échouer.
- Avec un user “driver”, tenter d’update `wallets` → doit échouer.

