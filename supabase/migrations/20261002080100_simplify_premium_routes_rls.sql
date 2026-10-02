-- premium_regional_routes_staff_write (FOR ALL) couvre déjà le SELECT du staff — la policy
-- premium_regional_routes_staff_read (FOR SELECT) était redondante et faisait remonter l'avis
-- Supabase "multiple permissive policies" (chaque requête SELECT devait évaluer 3 policies au
-- lieu de 2). Suppression sans changement de comportement : le staff garde l'accès via staff_write.
drop policy if exists premium_regional_routes_staff_read on public.premium_regional_routes;
