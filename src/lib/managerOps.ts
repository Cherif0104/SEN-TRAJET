import { supabase } from "@/lib/supabase";

export type RecentActivityItem = {
  id: string;
  kind: "booking_status" | "crm";
  label: string;
  detail: string | null;
  occurred_at: string;
};

/** Fil d'activité transverse (statuts de réservation + interactions CRM) pour la supervision. */
export async function listRecentActivity(limit = 30): Promise<RecentActivityItem[]> {
  const [statusRes, crmRes] = await Promise.all([
    supabase
      .from("booking_status_history")
      .select("id, to_status, note, created_at, booking:bookings(reference)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("crm_activities")
      .select("id, motif, subject, occurred_at, client:clients(full_name, company_name), partner:partner_organizations(legal_name)")
      .order("occurred_at", { ascending: false })
      .limit(limit),
  ]);

  const statusItems: RecentActivityItem[] = (statusRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const booking = Array.isArray(r.booking) ? r.booking[0] : r.booking;
    return {
      id: `status-${String(r.id)}`,
      kind: "booking_status",
      label: `${(booking as { reference?: string } | null)?.reference || "Réservation"} → ${r.to_status}`,
      detail: (r.note as string | null) ?? null,
      occurred_at: String(r.created_at),
    };
  });

  const crmItems: RecentActivityItem[] = (crmRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const client = Array.isArray(r.client) ? r.client[0] : r.client;
    const partner = Array.isArray(r.partner) ? r.partner[0] : r.partner;
    const target =
      (client as { full_name?: string; company_name?: string } | null)?.company_name ||
      (client as { full_name?: string } | null)?.full_name ||
      (partner as { legal_name?: string } | null)?.legal_name ||
      "Dossier";
    return {
      id: `crm-${String(r.id)}`,
      kind: "crm",
      label: `${target} · ${r.motif}`,
      detail: (r.subject as string | null) ?? null,
      occurred_at: String(r.occurred_at),
    };
  });

  return [...statusItems, ...crmItems]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, limit);
}
