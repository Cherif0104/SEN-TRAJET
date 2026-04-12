"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsForDriver, updateBookingStatus, type BookingWithTrip } from "@/lib/bookings";
import { MessageCircle, MapPin, ExternalLink, CheckCircle } from "lucide-react";

export default function ChauffeurReservationsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const refresh = () => {
    if (!user?.id) return;
    getBookingsForDriver(user.id).then(setBookings).catch(() => setBookings([]));
  };

  useEffect(() => {
    if (!user?.id) return;
    getBookingsForDriver(user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleMarkCompleted = async (b: BookingWithTrip) => {
    if (b.status === "completed") return;
    setCompletingId(b.id);
    try {
      await updateBookingStatus(b.id, "completed");
      refresh();
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mes réservations</h1>
      <p className="mt-1 text-neutral-600">
        Réservations acceptées sur vos trajets. Contactez le client via la messagerie.
      </p>

      {loading ? (
        <div className="mt-6 animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="mt-6 py-12 text-center">
          <p className="text-neutral-600">Aucune réservation</p>
          <p className="mt-1 text-sm text-neutral-500">
            Les réservations apparaîtront ici lorsque des clients réserveront vos trajets.
          </p>
          <Button href="/chauffeur/trajet/nouveau" className="mt-4">
            Publier un trajet
          </Button>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => {
            const trip = b.trip as { from_city?: string; to_city?: string; departure_time?: string } | undefined;
            const dep = trip?.from_city ?? "—";
            const arr = trip?.to_city ?? "—";
            const date = trip?.departure_time
              ? new Date(trip.departure_time).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : "—";
            const isPast = trip?.departure_time ? new Date(trip.departure_time) < new Date() : false;
            const canMarkCompleted = isPast && b.status === "confirmed";
            return (
              <li key={b.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {dep} → {arr}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {date}
                    </p>
                    <p className="text-sm text-neutral-600">
                      Client : {b.other_party_name ?? "—"} · {b.passengers} place{b.passengers > 1 ? "s" : ""} · {b.total_fcfa?.toLocaleString("fr-FR")} FCFA
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 capitalize">
                      {b.status}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canMarkCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkCompleted(b)}
                        disabled={completingId === b.id}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        {completingId === b.id ? "..." : "Marquer terminé"}
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" href={`/messages/${b.id}`}>
                      <MessageCircle className="mr-1 h-3.5 w-3.5" /> Message
                    </Button>
                    <Button size="sm" href={`/trajet/${b.trip_id}`}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> Voir le trajet
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
