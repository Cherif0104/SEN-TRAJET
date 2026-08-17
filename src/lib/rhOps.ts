import { supabase } from "@/lib/supabase";

export type RhDriverDocument = {
  id: string;
  driver_id: string;
  doc_type: string;
  file_url: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  driver: { full_name: string; phone: string | null } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listDriverDocuments(): Promise<RhDriverDocument[]> {
  const { data, error } = await supabase
    .from("driver_documents")
    .select(
      `id, driver_id, doc_type, file_url, status, reviewed_at, created_at,
       driver:drivers(full_name, phone)`
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      driver_id: String(r.driver_id),
      doc_type: String(r.doc_type),
      file_url: String(r.file_url),
      status: String(r.status),
      reviewed_at: (r.reviewed_at as string | null) ?? null,
      created_at: String(r.created_at),
      driver: firstRelation(r.driver as RhDriverDocument["driver"] | RhDriverDocument["driver"][] | null),
    };
  });
}

export async function updateDriverDocumentStatus(documentId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("driver_documents")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", documentId);
  if (error) throw error;
}
