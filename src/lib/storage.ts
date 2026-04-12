import { supabase } from "@/lib/supabase";

const BUCKET = "documents";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/**
 * Téléverse un document chauffeur dans le bucket Storage et retourne l’URL publique.
 * Créer le bucket "documents" dans Supabase (Storage) avec accès public en lecture si besoin.
 */
export async function uploadDriverDocument(
  driverId: string,
  docType: string,
  file: File
): Promise<string> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo)");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Type de fichier non autorisé (images ou PDF)");
  }

  const ext = file.name.split(".").pop() || "bin";
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const path = `${driverId}/${docType}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}
