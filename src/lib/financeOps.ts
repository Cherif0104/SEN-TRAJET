import { supabase } from "@/lib/supabase";

export type FinancePayment = {
  id: string;
  booking_id: string;
  amount_fcfa: number;
  currency: string | null;
  provider: string | null;
  provider_ref: string | null;
  booking_ref: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  booking: {
    reference: string | null;
    pickup: string;
    dropoff: string;
    pickup_time: string;
    client: { full_name: string | null; company_name: string | null } | null;
  } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listAllPayments(): Promise<FinancePayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `id, booking_id, amount_fcfa, currency, provider, provider_ref, booking_ref, status, paid_at, created_at,
       booking:bookings(reference, pickup, dropoff, pickup_time, client:clients(full_name, company_name))`
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const booking = firstRelation(r.booking as Record<string, unknown> | Record<string, unknown>[] | null);
    return {
      id: String(r.id),
      booking_id: String(r.booking_id),
      amount_fcfa: Number(r.amount_fcfa ?? 0),
      currency: (r.currency as string | null) ?? null,
      provider: (r.provider as string | null) ?? null,
      provider_ref: (r.provider_ref as string | null) ?? null,
      booking_ref: (r.booking_ref as string | null) ?? null,
      status: String(r.status),
      paid_at: (r.paid_at as string | null) ?? null,
      created_at: String(r.created_at),
      booking: booking
        ? {
            reference: (booking.reference as string | null) ?? null,
            pickup: String(booking.pickup ?? ""),
            dropoff: String(booking.dropoff ?? ""),
            pickup_time: String(booking.pickup_time ?? ""),
            client: firstRelation(booking.client as { full_name: string | null; company_name: string | null } | Array<{ full_name: string | null; company_name: string | null }> | null),
          }
        : null,
    };
  });
}

/** Réconciliation d'un paiement — ne modifie pas le workflow de la réservation (rôle de ops/commercial). */
export async function markPaymentPaid(paymentId: string, providerRef?: string | null): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(providerRef ? { provider_ref: providerRef } : {}),
    })
    .eq("id", paymentId);
  if (error) throw error;
}

export type FinanceInvoice = {
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

export async function listAllInvoices(): Promise<FinanceInvoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, booking_id, client_id, invoice_number, amount_ht, tax_amount, amount_ttc, currency, status, issued_at, due_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinanceInvoice[];
}

function makeInvoiceNumber(): string {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createInvoice(input: {
  bookingId?: string | null;
  clientId?: string | null;
  amountHt: number;
  taxAmount?: number;
  dueAt?: string | null;
}): Promise<FinanceInvoice> {
  const amountTtc = input.amountHt + (input.taxAmount ?? 0);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      booking_id: input.bookingId ?? null,
      client_id: input.clientId ?? null,
      invoice_number: makeInvoiceNumber(),
      amount_ht: input.amountHt,
      tax_amount: input.taxAmount ?? 0,
      amount_ttc: amountTtc,
      currency: "XOF",
      status: "sent",
      issued_at: new Date().toISOString(),
      due_at: input.dueAt || null,
    })
    .select("id, booking_id, client_id, invoice_number, amount_ht, tax_amount, amount_ttc, currency, status, issued_at, due_at, created_at")
    .single();
  if (error) throw error;
  return data as FinanceInvoice;
}

export async function updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
  const { error } = await supabase.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", invoiceId);
  if (error) throw error;
}

export type FinanceVehicleContract = {
  id: string;
  owner_id: string;
  vehicle_id: string | null;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  owner: { full_name: string | null; company_name: string | null } | null;
};

export async function listAllVehicleContracts(): Promise<FinanceVehicleContract[]> {
  const { data, error } = await supabase
    .from("vehicle_exploitation_contracts")
    .select(
      `id, owner_id, vehicle_id, vehicle_label, monthly_amount_fcfa, status, start_date, end_date,
       owner:vehicle_owners(full_name, company_name)`
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      owner_id: String(r.owner_id),
      vehicle_id: (r.vehicle_id as string | null) ?? null,
      vehicle_label: String(r.vehicle_label ?? ""),
      monthly_amount_fcfa: Number(r.monthly_amount_fcfa ?? 0),
      status: String(r.status),
      start_date: (r.start_date as string | null) ?? null,
      end_date: (r.end_date as string | null) ?? null,
      owner: firstRelation(r.owner as { full_name: string | null; company_name: string | null } | Array<{ full_name: string | null; company_name: string | null }> | null),
    };
  });
}
