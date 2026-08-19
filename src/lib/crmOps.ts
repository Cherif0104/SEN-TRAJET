import { supabase } from "@/lib/supabase";

export type CrmTargetType = "client" | "partner";

export type CrmClientTarget = {
  id: string;
  matricule: string | null;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
};

export type CrmPartnerTarget = {
  id: string;
  matricule: string | null;
  legal_name: string;
  certification_status: string;
  primary_contact_phone: string | null;
};

export type CrmStaff = {
  user_id: string;
  full_name: string;
  role: string;
};

export type CrmActivity = {
  id: string;
  client_id: string | null;
  partner_org_id: string | null;
  booking_id: string | null;
  channel: string;
  direction: string;
  motif: string;
  subject: string | null;
  message: string | null;
  handled_by: string | null;
  occurred_at: string;
  next_action_at: string | null;
  next_action_label: string | null;
  next_action_assignee: string | null;
  status: "open" | "done" | "cancelled";
  client: CrmClientTarget | null;
  partner: CrmPartnerTarget | null;
};

export type PartnerProspectInput = {
  legalName: string;
  category: "hotel" | "conciergerie" | "travel_agency" | "enterprise" | "other";
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  city?: string;
  notes?: string;
  estimatedMonthlyVolume?: number | null;
  needs?: string[];
  nextActionAt?: string | null;
  nextActionLabel?: string | null;
  nextActionAssignee?: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapActivity(row: Record<string, unknown>): CrmActivity {
  return {
    id: String(row.id),
    client_id: (row.client_id as string | null) ?? null,
    partner_org_id: (row.partner_org_id as string | null) ?? null,
    booking_id: (row.booking_id as string | null) ?? null,
    channel: String(row.channel),
    direction: String(row.direction),
    motif: String(row.motif),
    subject: (row.subject as string | null) ?? null,
    message: (row.message as string | null) ?? null,
    handled_by: (row.handled_by as string | null) ?? null,
    occurred_at: String(row.occurred_at),
    next_action_at: (row.next_action_at as string | null) ?? null,
    next_action_label: (row.next_action_label as string | null) ?? null,
    next_action_assignee: (row.next_action_assignee as string | null) ?? null,
    status: String(row.status) as CrmActivity["status"],
    client: firstRelation(row.client as CrmClientTarget | CrmClientTarget[] | null),
    partner: firstRelation(row.partner as CrmPartnerTarget | CrmPartnerTarget[] | null),
  };
}

const ACTIVITY_SELECT = `
  id, client_id, partner_org_id, booking_id, channel, direction, motif,
  subject, message, handled_by, occurred_at, next_action_at,
  next_action_label, next_action_assignee, status,
  client:clients(id, matricule, full_name, company_name, phone),
  partner:partner_organizations(
    id, matricule, legal_name, certification_status, primary_contact_phone
  )
`;

export async function listCrmActivities(limit = 100): Promise<CrmActivity[]> {
  const { data, error } = await supabase
    .from("crm_activities")
    .select(ACTIVITY_SELECT)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => mapActivity(row as Record<string, unknown>));
}

export async function listOpenCrmActions(limit = 100): Promise<CrmActivity[]> {
  const { data, error } = await supabase
    .from("crm_activities")
    .select(ACTIVITY_SELECT)
    .eq("status", "open")
    .not("next_action_at", "is", null)
    .order("next_action_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => mapActivity(row as Record<string, unknown>));
}

export async function listCrmTargets(): Promise<{
  clients: CrmClientTarget[];
  partners: CrmPartnerTarget[];
}> {
  const [clientsRes, partnersRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, matricule, full_name, company_name, phone")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_organizations")
      .select("id, matricule, legal_name, certification_status, primary_contact_phone")
      .order("created_at", { ascending: false }),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (partnersRes.error) throw partnersRes.error;
  return {
    clients: (clientsRes.data ?? []) as CrmClientTarget[],
    partners: (partnersRes.data ?? []) as CrmPartnerTarget[],
  };
}

export async function listCrmStaff(): Promise<CrmStaff[]> {
  const { data, error } = await supabase.rpc("list_crm_staff");
  if (error) throw error;
  return (data ?? []) as CrmStaff[];
}

export async function createCrmActivity(input: {
  targetType: CrmTargetType;
  targetId: string;
  channel: string;
  direction: string;
  motif: string;
  subject?: string;
  message?: string;
  nextActionAt?: string | null;
  nextActionLabel?: string | null;
  nextActionAssignee?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("create_crm_activity", {
    p_client_id: input.targetType === "client" ? input.targetId : null,
    p_partner_org_id: input.targetType === "partner" ? input.targetId : null,
    p_lead_id: null,
    p_booking_id: null,
    p_channel: input.channel,
    p_direction: input.direction,
    p_motif: input.motif,
    p_subject: input.subject?.trim() || null,
    p_message: input.message?.trim() || null,
    p_next_action_at: input.nextActionAt || null,
    p_next_action_label: input.nextActionLabel?.trim() || null,
    p_next_action_assignee: input.nextActionAssignee || null,
  });
  if (error) throw error;
}

export async function completeCrmActivity(activityId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_crm_activity", {
    p_activity_id: activityId,
  });
  if (error) throw error;
}

export async function createPartnerProspect(input: PartnerProspectInput): Promise<CrmPartnerTarget> {
  const { data, error } = await supabase.rpc("create_partner_prospect", {
    p_legal_name: input.legalName.trim(),
    p_category: input.category,
    p_primary_contact_name: input.contactName?.trim() || null,
    p_primary_contact_phone: input.contactPhone?.trim() || null,
    p_primary_contact_email: input.contactEmail?.trim() || null,
    p_city: input.city?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_diagnostic: {
      estimated_monthly_volume: input.estimatedMonthlyVolume ?? null,
      needs: input.needs ?? [],
    },
    p_next_action_at: input.nextActionAt || null,
    p_next_action_label: input.nextActionLabel?.trim() || null,
    p_next_action_assignee: input.nextActionAssignee || null,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row?.id) throw new Error("Le prospect n’a pas été créé.");
  return {
    id: String(row.id),
    matricule: (row.matricule as string | null) ?? null,
    legal_name: String(row.legal_name),
    certification_status: String(row.certification_status),
    primary_contact_phone: (row.primary_contact_phone as string | null) ?? null,
  };
}

export type Lead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const LEAD_STATUSES = ["nouveau", "contacte", "qualifie", "converti", "perdu"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  qualifie: "Qualifié",
  converti: "Converti",
  perdu: "Perdu",
};

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, full_name, phone, email, source, status, notes, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function createLead(input: {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  notes?: string | null;
}): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      source: input.source || "commercial",
      status: "nouveau",
      notes: input.notes?.trim() || null,
    })
    .select("id, full_name, phone, email, source, status, notes, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", leadId);
  if (error) throw error;
}

export function crmTargetLabel(activity: CrmActivity): string {
  if (activity.client) {
    const name = activity.client.company_name || activity.client.full_name || "Client";
    return `${activity.client.matricule ? `${activity.client.matricule} · ` : ""}${name}`;
  }
  if (activity.partner) {
    return `${activity.partner.matricule ? `${activity.partner.matricule} · ` : ""}${activity.partner.legal_name}`;
  }
  return "Dossier non lié";
}
