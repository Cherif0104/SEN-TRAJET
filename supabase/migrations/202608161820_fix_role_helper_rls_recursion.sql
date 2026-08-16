-- Les helpers de rôle sont utilisés dans les policies RLS.
-- Ils doivent contourner la policy de user_roles, sinon :
-- policy → has_any_role → user_roles policy → has_role → user_roles → récursion.
-- Ils ne renvoient qu'un booléen et conservent un search_path fixe.

alter function public.has_any_role(public.app_role[]) security definer;
alter function public.has_any_role(public.app_role[]) set search_path = public;

alter function public.has_role(public.app_role) security definer;
alter function public.has_role(public.app_role) set search_path = public;
