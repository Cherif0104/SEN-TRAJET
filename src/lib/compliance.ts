import { supabase } from "@/lib/supabase";

export type ComplianceCheck = {
  id: string;
  driver_id: string;
  check_type: "onboarding_kyc" | "weekly_recheck" | "biweekly_recheck" | "manual_review" | string;
  status: "pending" | "approved" | "rejected" | "expired" | string;
  due_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
};

export async function getDriverComplianceChecks(driverId: string): Promise<ComplianceCheck[]> {
  const { data, error } = await supabase
    .from("driver_compliance_checks")
    .select("*")
    .eq("driver_id", driverId)
    .order("due_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as ComplianceCheck[];
}

export async function scheduleDriverComplianceLifecycle(driverId: string): Promise<void> {
  const now = new Date();
  const oneWeek = new Date(now);
  oneWeek.setDate(now.getDate() + 7);
  const twoWeeks = new Date(now);
  twoWeeks.setDate(now.getDate() + 14);

  const rows = [
    { driver_id: driverId, check_type: "onboarding_kyc", status: "pending", due_at: now.toISOString() },
    { driver_id: driverId, check_type: "weekly_recheck", status: "pending", due_at: oneWeek.toISOString() },
    { driver_id: driverId, check_type: "biweekly_recheck", status: "pending", due_at: twoWeeks.toISOString() },
  ];

  const { error } = await supabase.from("driver_compliance_checks").insert(rows);
  if (error) throw error;
}

