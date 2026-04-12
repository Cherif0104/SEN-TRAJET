import { supabase } from "@/lib/supabase";

export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export async function getMessagesByBooking(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  bookingId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ booking_id: bookingId, sender_id: senderId, body })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export type BookingWithLastMessage = {
  id: string;
  client_id: string;
  driver_id: string;
  status: string;
  created_at: string;
  other_party_name: string;
  last_message_body: string | null;
  last_message_at: string | null;
};

export async function getBookingsForUser(userId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, client_id, driver_id, status, created_at")
    .or(`client_id.eq.${userId},driver_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBookingsWithLastMessage(
  userId: string
): Promise<BookingWithLastMessage[]> {
  const bookings = await getBookingsForUser(userId);
  if (bookings.length === 0) return [];

  const bookingIds = bookings.map((b) => b.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("booking_id, body, created_at")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  const lastByBooking: Record<string, { body: string; created_at: string }> = {};
  for (const m of messages ?? []) {
    if (!lastByBooking[m.booking_id]) {
      lastByBooking[m.booking_id] = {
        body: m.body,
        created_at: m.created_at,
      };
    }
  }

  const profileIds = [
    ...new Set(
      bookings.flatMap((b) =>
        b.client_id === userId ? [b.driver_id] : [b.client_id]
      )
    ),
  ];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);
  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = p.full_name || "Utilisateur";
  }

  return bookings.map((b) => {
    const otherId = b.client_id === userId ? b.driver_id : b.client_id;
    const last = lastByBooking[b.id];
    return {
      id: b.id,
      client_id: b.client_id,
      driver_id: b.driver_id,
      status: b.status,
      created_at: b.created_at,
      other_party_name: nameById[otherId] || "—",
      last_message_body: last?.body ?? null,
      last_message_at: last?.created_at ?? null,
    };
  });
}
