import { supabase } from "@/lib/supabase";

export type RoleHeadcount = { role: string; count: number };

export async function listRoleHeadcounts(): Promise<RoleHeadcount[]> {
  const { data, error } = await supabase.from("user_roles").select("role");
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const role = String((row as { role: string }).role);
    map.set(role, (map.get(role) ?? 0) + 1);
  }
  return [...map.entries()].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);
}

export type AuditLogEntry = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export async function listAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, entity, entity_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}
