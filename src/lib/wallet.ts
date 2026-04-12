import { supabase } from "@/lib/supabase";

export type Wallet = {
  id: string;
  driver_id: string;
  balance_credits: number;
};

export type Transaction = {
  id: string;
  wallet_id: string;
  type: "recharge" | "debit" | "refund" | "bonus";
  credits: number;
  reference: string | null;
  description: string | null;
  created_at: string;
};

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price_fcfa: number;
};

export async function getWallet(driverId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("driver_id", driverId)
    .single();
  if (error) return null;
  return data as Wallet;
}

export async function getTransactions(driverId: string): Promise<Transaction[]> {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("driver_id", driverId)
    .single();
  if (!wallet) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as Transaction[];
}

export async function getCreditPackages(): Promise<CreditPackage[]> {
  const { data, error } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("price_fcfa", { ascending: true });
  if (error) return [];
  return (data ?? []) as CreditPackage[];
}

export async function createPaymentIntent(params: {
  driverId: string;
  packageId: string;
  amountFcfa: number;
  provider: "wave" | "orange_money" | "free_money";
}) {
  const { data, error } = await supabase
    .from("payment_intents")
    .insert({
      driver_id: params.driverId,
      package_id: params.packageId,
      amount_fcfa: params.amountFcfa,
      provider: params.provider,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Crée une session Wave Checkout et retourne l’URL de redirection.
 * Le client doit être connecté (session Supabase).
 */
export async function createWaveCheckoutSession(
  packageId: string
): Promise<{ checkout_url: string; free_period?: boolean; simulation?: boolean }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Non connecté");
  }
  const res = await fetch("/api/checkout/wave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      package_id: packageId,
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Erreur lors de la création du paiement");
  }
  if (!data.checkout_url) {
    throw new Error("URL de paiement manquante");
  }
  return {
    checkout_url: data.checkout_url,
    free_period: !!data.free_period,
    simulation: !!data.simulation,
  };
}

/**
 * Confirme un paiement en mode simulation (après redirection avec ?wave=simulate&intent_id=xxx).
 */
export async function confirmWaveSimulation(intentId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Non connecté");
  const res = await fetch("/api/checkout/wave/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      intent_id: intentId,
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur lors de la confirmation");
}
