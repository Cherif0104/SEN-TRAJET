import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function requestedAccountType(user: User | null | undefined): "client" | "driver" {
  return user?.user_metadata?.account_type === "driver" ? "driver" : "client";
}

/**
 * User metadata records onboarding intent only. Authorization is granted by the
 * narrow server RPC, which can only promote the authenticated caller to driver.
 */
export async function ensureRequestedDriverApplication(user: User | null | undefined): Promise<boolean> {
  if (!user || requestedAccountType(user) !== "driver") return false;
  const { error } = await supabase.rpc("register_driver_application");
  if (error) throw error;
  return true;
}
