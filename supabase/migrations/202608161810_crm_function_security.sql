-- Hardening des fonctions CRM exposées par la Data API.
-- Les mutations utilisent RLS (SECURITY INVOKER) ; seule la liste du staff
-- reste DEFINER car les commerciaux ne peuvent pas lire tous les profiles.

alter function public.create_crm_activity(
  uuid, uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, uuid
) security invoker;

alter function public.complete_crm_activity(uuid) security invoker;

alter function public.create_partner_prospect(
  text, text, text, text, text, text, text, jsonb, timestamptz, text, uuid
) security invoker;

revoke execute on function public.list_crm_staff() from anon;
revoke execute on function public.create_crm_activity(
  uuid, uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, uuid
) from anon;
revoke execute on function public.complete_crm_activity(uuid) from anon;
revoke execute on function public.create_partner_prospect(
  text, text, text, text, text, text, text, jsonb, timestamptz, text, uuid
) from anon;
revoke execute on function public.write_audit_log(text, text, text, jsonb) from anon;

alter function public.next_client_matricule() set search_path = public;
alter function public.clients_assign_matricule() set search_path = public;
alter function public.next_partner_org_matricule() set search_path = public;
alter function public.partner_org_assign_matricule() set search_path = public;
alter function public.partner_org_guard_user_link() set search_path = public;
alter function public.next_owner_matricule() set search_path = public;
alter function public.owners_assign_matricule() set search_path = public;
