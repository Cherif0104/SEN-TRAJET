import { supabase } from "@/lib/supabase";

export type PartnerClient = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  client_type: string;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  referred_by_partner_contract_id: string | null;
};

export async function listPartnerClients(contractId: string): Promise<PartnerClient[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, full_name, company_name, phone, email, client_type, whatsapp, address, notes, created_at, referred_by_partner_contract_id"
    )
    .eq("referred_by_partner_contract_id", contractId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerClient[];
}

export async function getPartnerClient(id: string): Promise<PartnerClient | null> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, full_name, company_name, phone, email, client_type, whatsapp, address, notes, created_at, referred_by_partner_contract_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PartnerClient | null) ?? null;
}

export async function createPartnerClient(input: {
  contractId: string;
  fullName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  notes?: string | null;
  clientType?: "particulier" | "entreprise";
}): Promise<PartnerClient> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      referred_by_partner_contract_id: input.contractId,
      full_name: input.fullName ?? null,
      company_name: input.companyName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      whatsapp: input.whatsapp ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      client_type: input.clientType ?? "particulier",
    })
    .select(
      "id, full_name, company_name, phone, email, client_type, whatsapp, address, notes, created_at, referred_by_partner_contract_id"
    )
    .single();
  if (error) throw error;
  return data as PartnerClient;
}

export type PartnerInvoice = {
  id: string;
  booking_id: string | null;
  client_id: string | null;
  invoice_number: string;
  amount_ht: number | null;
  tax_amount: number | null;
  amount_ttc: number | null;
  currency: string | null;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  created_at: string;
};

export type PartnerPayment = {
  id: string;
  booking_id: string;
  amount_fcfa: number;
  status: string;
  created_at: string;
};

/** Paiements liés aux réservations du contrat partenaire (RLS `payments_read_partner`). */
export async function listPartnerPayments(): Promise<PartnerPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, booking_id, amount_fcfa, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerPayment[];
}

/** Factures liées aux réservations du contrat partenaire (RLS `invoices_read_partner`). */
export async function listPartnerInvoices(): Promise<PartnerInvoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, booking_id, client_id, invoice_number, amount_ht, tax_amount, amount_ttc, currency, status, issued_at, due_at, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerInvoice[];
}
