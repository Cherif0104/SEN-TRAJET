import { supabase } from "@/lib/supabase";

export type FavoriteAddress = {
  id: string;
  client_id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export async function listFavoriteAddresses(clientId: string): Promise<FavoriteAddress[]> {
  const { data, error } = await supabase
    .from("client_favorite_addresses")
    .select("id, client_id, label, address, lat, lng, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FavoriteAddress[];
}

export async function createFavoriteAddress(input: {
  clientId: string;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<FavoriteAddress> {
  const { data, error } = await supabase
    .from("client_favorite_addresses")
    .insert({
      client_id: input.clientId,
      label: input.label,
      address: input.address,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .select("id, client_id, label, address, lat, lng, created_at")
    .single();
  if (error) throw error;
  return data as FavoriteAddress;
}

export async function deleteFavoriteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("client_favorite_addresses").delete().eq("id", id);
  if (error) throw error;
}
