-- Durcissement défense-en-profondeur : verify_allo_dakar_vehicle a déjà un contrôle de rôle
-- interne (super_admin/manager/ops ou gestionnaire du garage propriétaire) qui bloque tout appel
-- anonyme (auth.uid() est null, has_any_role renvoie false) — donc pas de faille active. On
-- retire quand même le droit d'exécution anonyme : un appel anon ne doit même pas pouvoir
-- atteindre la fonction, au lieu de dépendre uniquement de son contrôle interne pour être rejeté.
revoke execute on function public.verify_allo_dakar_vehicle(uuid, boolean, text) from anon;
