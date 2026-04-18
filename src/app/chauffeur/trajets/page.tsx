"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsForDriver, type BookingWithTrip } from "@/lib/bookings";
import { getTripsForDriver, type DriverTripListItem } from "@/lib/driverTrips";
import { BOOKING_STATUS_LABEL, bookingStatusStyle } from "@/lib/statusLabels";
import { CalendarClock, MapPin, PlusCircle } from "lucide-react";

const TRIP_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "Publié",
  completed: "Terminé",
  cancelled: "Annulé",
};

type ActiveBucket = "pending_client" | "confirmed_live" | "published_open";

function tripBookings(tripId: string, bookings: BookingWithTrip[]) {
  return bookings.filter((b) => b.trip_id === tripId);
}

function classifyActiveTrip(trip: DriverTripListItem, bookings: BookingWithTrip[]): ActiveBucket {
  const books = tripBookings(trip.id, bookings).filter((b) => b.status !== "cancelled" && b.status !== "completed");
  const hasPending = books.some((b) => b.status === "pending");
  if (hasPending) return "pending_client";
  const hasLive = books.some((b) => b.status === "confirmed" || b.status === "in_progress");
  if (hasLive) return "confirmed_live";
  return "published_open";
}

function formatDeparture(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TripRow({ trip, bookings }: { trip: DriverTripListItem; bookings: BookingWithTrip[] }) {
  const related = tripBookings(trip.id, bookings);
  const detailHref = trip.status === "active" ? `/trajet/${trip.id}` : null;

  return (
    <Card className="border border-neutral-200/90">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900">
            {trip.from_city} → {trip.to_city}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              {formatDeparture(trip.departure_time)}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {TRIP_STATUS_LABEL[trip.status] ?? trip.status}
            </span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {trip.available_seats}/{trip.total_seats} places · {trip.price_fcfa.toLocaleString("fr-FR")} FCFA
          </p>
          {related.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
              {related.slice(0, 4).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${bookingStatusStyle(b.status)}`}>
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <span>
                    {b.passengers} p. · {b.total_fcfa.toLocaleString("fr-FR")} FCFA
                  </span>
                  {b.other_party_name && <span className="text-neutral-500">· {b.other_party_name}</span>}
                </li>
              ))}
              {related.length > 4 && (
                <li className="text-xs text-neutral-500">+ {related.length - 4} autre(s) réservation(s)</li>
              )}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {detailHref ? (
            <Button size="sm" variant="secondary" href={detailHref}>
              Voir le trajet
            </Button>
          ) : (
            <span className="self-center text-xs text-neutral-500">Détail non disponible (trajet clôturé)</span>
          )}
          <Button size="sm" variant="ghost" href="/chauffeur/reservations">
            Réservations
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Section({
  title,
  description,
  trips,
  bookings,
  empty,
}: {
  title: string;
  description: string;
  trips: DriverTripListItem[];
  bookings: BookingWithTrip[];
  empty: string;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-bold text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      <div className="mt-3 space-y-2">
        {trips.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-6 text-center text-sm text-neutral-500">
            {empty}
          </p>
        ) : (
          trips.map((t) => <TripRow key={t.id} trip={t} bookings={bookings} />)
        )}
      </div>
    </section>
  );
}

export default function ChauffeurTrajetsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<DriverTripListItem[]>([]);
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getTripsForDriver(user.id), getBookingsForDriver(user.id)])
      .then(([t, b]) => {
        if (!cancelled) {
          setTrips(t);
          setBookings(b);
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Chargement impossible.");
          setTrips([]);
          setBookings([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const { pendingTrips, confirmedTrips, publishedTrips, closedTrips } = useMemo(() => {
    const active = trips.filter((t) => t.status === "active");
    const closed = trips.filter((t) => t.status !== "active");

    const pending: DriverTripListItem[] = [];
    const confirmed: DriverTripListItem[] = [];
    const published: DriverTripListItem[] = [];

    for (const t of active) {
      const bucket = classifyActiveTrip(t, bookings);
      if (bucket === "pending_client") pending.push(t);
      else if (bucket === "confirmed_live") confirmed.push(t);
      else published.push(t);
    }

    return {
      pendingTrips: pending,
      confirmedTrips: confirmed,
      publishedTrips: published,
      closedTrips: closed,
    };
  }, [trips, bookings]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Mes trajets</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Suivez vos publications, les réservations en attente, confirmées et les trajets clôturés.
          </p>
        </div>
        <Button variant="primary" size="sm" href="/chauffeur/trajet/nouveau" className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nouveau trajet
        </Button>
      </div>

      {loadError && (
        <Card className="mt-4 border border-red-200 bg-red-50/60">
          <p className="text-sm text-red-800">{loadError}</p>
        </Card>
      )}

      {loading ? (
        <ListSkeleton className="mt-6 animate-pulse space-y-3" />
      ) : (
        <>
          <Section
            title="Réservations en attente"
            description="Des clients ont réservé : validez ou refusez depuis Mes réservations."
            trips={pendingTrips}
            bookings={bookings}
            empty="Aucune réservation en attente de validation."
          />
          <Section
            title="Confirmées ou en route"
            description="Courses acceptées ou démarrées — à gérer dans Mes réservations jusqu’au terme."
            trips={confirmedTrips}
            bookings={bookings}
            empty="Aucun trajet avec réservation confirmée ou en route."
          />
          <Section
            title="Publiés (places disponibles)"
            description="Trajets actifs visibles côté voyageurs, sans réservation en cours sur cette liste."
            trips={publishedTrips}
            bookings={bookings}
            empty="Aucun trajet publié « libre » pour le moment. Publiez un trajet pour apparaître ici."
          />
          <Section
            title="Terminés ou clôturés"
            description="Trajets marqués terminés, annulés ou brouillons dans le système."
            trips={closedTrips}
            bookings={bookings}
            empty="Aucun trajet clôturé enregistré."
          />
        </>
      )}

      <p className="mt-8 text-center text-sm text-neutral-500">
        <Link href="/chauffeur" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <MapPin className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </p>
    </>
  );
}
