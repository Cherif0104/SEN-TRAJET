-- Les helpers RLS ne doivent pas être appelables par les visiteurs anonymes.
revoke all on function public.has_any_role(public.app_role[]) from public;
revoke execute on function public.has_any_role(public.app_role[]) from anon;
grant execute on function public.has_any_role(public.app_role[]) to authenticated;

revoke all on function public.has_role(public.app_role) from public;
revoke execute on function public.has_role(public.app_role) from anon;
grant execute on function public.has_role(public.app_role) to authenticated;

-- Table de référence utilisée par le calcul de trajet, en lecture seule.
drop policy if exists "region_distances_public_select" on public.region_distances;
create policy "region_distances_public_select"
on public.region_distances for select
to anon, authenticated
using (true);
