"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Entity360Workspace } from "@/components/admin/Entity360Workspace";
import { SjBadge, SjCard } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";
import type { PlatformClient } from "@/lib/platformOps";

type BookingRow = {
  id: string;
  reference: string | null;
  status: string;
  pickup: string;
  dropoff: string;
  pickup_time: string;
  final_amount_fcfa: number | null;
  estimated_price: number | null;
};

type PaymentRow = {
  id: string;
  booking_id: string | null;
  amount_fcfa: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<PlatformClient | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const clientResult = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (clientResult.error) throw new Error(clientResult.error.message);
      if (!clientResult.data) throw new Error("Client introuvable.");
      const bookingResult = await supabase
        .from("bookings")
        .select(
          "id,reference,status,pickup,dropoff,pickup_time,final_amount_fcfa,estimated_price",
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (bookingResult.error) throw new Error(bookingResult.error.message);
      const bookingIds = (bookingResult.data ?? []).map((row) => row.id);
      const paymentResult = bookingIds.length
        ? await supabase
            .from("payments")
            .select("id,booking_id,amount_fcfa,status,paid_at,created_at")
            .in("booking_id", bookingIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null };
      if (paymentResult.error) throw new Error(paymentResult.error.message);
      setClient(clientResult.data as PlatformClient);
      setBookings((bookingResult.data ?? []) as BookingRow[]);
      setPayments((paymentResult.data ?? []) as PaymentRow[]);
    };
    void load()
      .catch((failure) =>
        setError(failure instanceof Error ? failure.message : "Chargement impossible."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const revenue = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0),
    [payments],
  );

  if (loading) return <SjCard>Chargement du client…</SjCard>;
  if (!client) return <SjCard>{error || "Client introuvable."}</SjCard>;

  const name = client.company_name || client.full_name || "Client";

  return (
    <Entity360Workspace
      entityType="client"
      entityId={client.id}
      backHref="/admin/clients"
      eyebrow="Client · vue 360"
      title={name}
      subtitle={client.notes}
      imageUrl={client.avatar_url}
      status={client.user_id ? "Compte actif" : "Sans compte"}
      facts={[
        { label: "Matricule", value: client.matricule || "—" },
        { label: "Type", value: client.client_type },
        { label: "Téléphone", value: client.phone || "—" },
        { label: "E-mail", value: client.email || "—" },
      ]}
      metrics={[
        { label: "Réservations", value: bookings.length },
        {
          label: "Terminées",
          value: bookings.filter((booking) => booking.status === "completed").length,
        },
        { label: "Chiffre encaissé", value: `${revenue.toLocaleString("fr-FR")} F` },
        {
          label: "Paiements en attente",
          value: payments.filter((payment) => payment.status !== "paid").length,
        },
      ]}
      overview={
        <div className="space-y-5">
          <SjCard>
            <h2 className="text-lg font-extrabold">Dernières réservations</h2>
            <div className="mt-4 space-y-3">
              {bookings.slice(0, 6).map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-secondary)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <b>{booking.reference || booking.id.slice(0, 8)}</b>
                    <p className="sj-muted text-sm">
                      {booking.pickup} → {booking.dropoff}
                    </p>
                  </div>
                  <div className="text-right">
                    <SjBadge tone="blue">{booking.status}</SjBadge>
                    <p className="mt-1 text-sm font-bold">
                      {Number(
                        booking.final_amount_fcfa ?? booking.estimated_price ?? 0,
                      ).toLocaleString("fr-FR")}{" "}
                      FCFA
                    </p>
                  </div>
                </div>
              ))}
              {!bookings.length ? (
                <p className="sj-muted text-sm">Aucune réservation.</p>
              ) : null}
            </div>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Paiements liés</h2>
            <div className="mt-4 space-y-2">
              {payments.slice(0, 6).map((payment) => (
                <div key={payment.id} className="sj-between gap-3 text-sm">
                  <span>{new Date(payment.created_at).toLocaleDateString("fr-FR")}</span>
                  <b>{Number(payment.amount_fcfa).toLocaleString("fr-FR")} FCFA</b>
                  <SjBadge tone={payment.status === "paid" ? "green" : "blue"}>
                    {payment.status}
                  </SjBadge>
                </div>
              ))}
            </div>
          </SjCard>
        </div>
      }
    />
  );
}
