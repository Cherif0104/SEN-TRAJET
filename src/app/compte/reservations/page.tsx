"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsForClient, cancelBooking, type BookingWithTrip } from "@/lib/bookings";
import { MessageCircle, MapPin, Star, XCircle } from "lucide-react";

export default function CompteReservationsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const refresh = () => {
    if (!user?.id) return;
    getBookingsForClient(user.id).then(setBookings).catch(() => setBookings([]));
  };

  useEffect(() => {
    if (!user?.id) return;
    getBookingsForClient(user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleCancelBooking = async (b: BookingWithTrip) => {
    const trip = b.trip as { departure_time?: string } | undefined;
    const depTime = trip?.departure_time ? new Date(trip.departure_time) : null;
    if (!depTime || depTime < new Date()) return;
    if (b.status !== "confirmed") return;
    setCancellingId(b.id);
    try {
      await cancelBooking(b.id);
      setConfirmCancelId(null);
      refresh();
    } catch {
      // erreur affichée ou toast
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mes réservations</h1>
      <p className="mt-1 text-neutral-600">
        Liste de vos réservations. Cliquez pour voir le détail ou envoyer un message au chauffeur.
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
            Réservez un trajet depuis la recherche ou en publiant une demande.
          </p>
          <Button href="/recherche" className="mt-4">
            Rechercher un trajet
          </Button>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => {
            const trip = b.trip as { from_city?: string; to_city?: string; departure_time?: string; driver_name?: string } | undefined;
            const dep = trip?.from_city ?? "—";
            const arr = trip?.to_city ?? "—";
            const date = trip?.departure_time
              ? new Date(trip.departure_time).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : "—";
            const isTripPast = trip?.departure_time ? new Date(trip.departure_time) < new Date() : false;
            const canReview = b.status === "completed" || (isTripPast && b.status === "confirmed");
            const canCancel = b.status === "confirmed" && !isTripPast;
            const isCancelling = cancellingId === b.id;
            const showConfirmCancel = confirmCancelId === b.id;
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
                      Chauffeur : {b.other_party_name ?? trip?.driver_name ?? "—"} · {b.passengers} place{b.passengers > 1 ? "s" : ""} · {b.total_fcfa?.toLocaleString("fr-FR")} FCFA
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 capitalize">
                      {b.status}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {showConfirmCancel ? (
                      <>
                        <span className="text-xs text-neutral-600">Annuler cette réservation ?</span>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmCancelId(null)} disabled={isCancelling}>
                          Non
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleCancelBooking(b)} isLoading={isCancelling}>
                          Oui, annuler
                        </Button>
                      </>
                    ) : (
                      <>
                        {canCancel && (
                          <Button size="sm" variant="ghost" onClick={() => setConfirmCancelId(b.id)} className="text-amber-600 hover:text-amber-700">
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Annuler
                          </Button>
                        )}
                        {canReview && (
                          <Button size="sm" variant="outline" href={`/avis/${b.id}`}>
                            <Star className="mr-1 h-3.5 w-3.5" /> Noter
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" href={`/messages/${b.id}`}>
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Message
                        </Button>
                        <Button size="sm" href={`/trajet/${b.trip_id}`}>
                          Voir le trajet
                        </Button>
                      </>
                    )}
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
