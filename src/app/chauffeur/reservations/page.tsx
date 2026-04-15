"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsForDriver, updateBookingStatus, type BookingWithTrip } from "@/lib/bookings";
import { MessageCircle, MapPin, ExternalLink, CheckCircle, Navigation } from "lucide-react";
import { BOOKING_STATUS_LABEL, bookingStatusStyle } from "@/lib/statusLabels";

export default function ChauffeurReservationsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const activeTab = searchParams.get("tab") === "history" ? "history" : "active";

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
      setSuccessMessage("Réservation marquée comme terminée.");
      refresh();
    } finally {
      setCompletingId(null);
    }
  };

  const handleMarkEnRoute = async (b: BookingWithTrip) => {
    if (b.status !== "pending") return;
    setMovingId(b.id);
    try {
      await updateBookingStatus(b.id, "confirmed");
      setSuccessMessage("Course marquée en route.");
      refresh();
    } finally {
      setMovingId(null);
    }
  };

  const visibleBookings = bookings.filter((b) =>
    activeTab === "history" ? b.status === "completed" : b.status !== "completed" && b.status !== "cancelled"
  );

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mes réservations</h1>
      <p className="mt-1 text-neutral-600">
        Gérez les passagers confirmés sur vos trajets et marquez les courses terminées après départ.
      </p>
      {successMessage && <FeedbackBanner className="mt-4" tone="success" message={successMessage} />}
      <div className="mt-4 inline-flex rounded-xl border border-neutral-200 bg-white p-1">
        <Button
          size="sm"
          variant={activeTab === "active" ? "primary" : "ghost"}
          href="/chauffeur/reservations"
        >
          Courses actives
        </Button>
        <Button
          size="sm"
          variant={activeTab === "history" ? "primary" : "ghost"}
          href="/chauffeur/reservations?tab=history"
        >
          Historique
        </Button>
      </div>

      {loading ? (
        <ListSkeleton className="mt-6 animate-pulse space-y-3" />
      ) : visibleBookings.length === 0 ? (
        <Card className="mt-6 py-12 text-center">
          <p className="text-neutral-600">
            {activeTab === "history" ? "Aucune course terminée" : "Aucune réservation active"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {activeTab === "history"
              ? "Les courses terminées apparaîtront ici."
              : "Les réservations apparaîtront ici lorsque des clients réserveront vos trajets."}
          </p>
          <Button href="/chauffeur/trajet/nouveau" className="mt-4">
            Publier un trajet
          </Button>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="border border-neutral-200 bg-neutral-50">
              <p className="text-xs text-neutral-500">Total</p>
              <p className="text-xl font-bold text-neutral-900">{bookings.length}</p>
            </Card>
            <Card className="border border-emerald-200 bg-emerald-50">
              <p className="text-xs text-emerald-700">Confirmées</p>
              <p className="text-xl font-bold text-emerald-800">
                {bookings.filter((b) => b.status === "confirmed").length}
              </p>
            </Card>
            <Card className="border border-sky-200 bg-sky-50">
              <p className="text-xs text-sky-700">Terminées</p>
              <p className="text-xl font-bold text-sky-800">
                {bookings.filter((b) => b.status === "completed").length}
              </p>
            </Card>
          </div>
          <ul className="mt-4 space-y-3">
          {visibleBookings.map((b) => {
            const trip = b.trip as { from_city?: string; to_city?: string; departure_time?: string } | undefined;
            const dep = trip?.from_city ?? "—";
            const arr = trip?.to_city ?? "—";
            const date = trip?.departure_time
              ? new Date(trip.departure_time).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : "—";
            const canMarkEnRoute = b.status === "pending";
            const canMarkCompleted = b.status === "confirmed";
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
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        bookingStatusStyle(b.status)
                      }`}
                    >
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canMarkEnRoute && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkEnRoute(b)}
                        disabled={movingId === b.id}
                      >
                        <Navigation className="mr-1 h-3.5 w-3.5" />
                        {movingId === b.id ? "..." : "Marquer en route"}
                      </Button>
                    )}
                    {canMarkCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkCompleted(b)}
                        disabled={completingId === b.id}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        {completingId === b.id ? "..." : "Terminer la course"}
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
        </>
      )}
    </>
  );
}
