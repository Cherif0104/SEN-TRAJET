"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  assignDriverToBooking,
  listAssignments,
  listFleetDrivers,
  type TripAssignment,
} from "@/lib/dispatch";
import { listRecentBookingsForDispatch } from "@/lib/adminOps";

type BookingRow = {
  id: string;
  status: string;
  total_fcfa: number;
  passengers: number;
  driver_id: string | null;
  trip_id: string | null;
  partner_id?: string | null;
  billed_price_fcfa?: number | null;
  created_at: string;
  trip?:
    | {
        id: string;
        from_city: string;
        to_city: string;
        departure_time: string;
        price_fcfa: number;
      }
    | {
        id: string;
        from_city: string;
        to_city: string;
        departure_time: string;
        price_fcfa: number;
      }[]
    | null;
};

type DriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  employment_type?: string | null;
};

function tripLabel(booking: BookingRow) {
  const trip = Array.isArray(booking.trip) ? booking.trip[0] : booking.trip;
  if (!trip) return "Trajet non renseigné";
  return `${trip.from_city} → ${trip.to_city}`;
}

export default function AdminDispatchPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [assignments, setAssignments] = useState<TripAssignment[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [b, d, a] = await Promise.all([
        listRecentBookingsForDispatch(50),
        listFleetDrivers(),
        listAssignments({ limit: 30 }),
      ]);
      setBookings(b as BookingRow[]);
      setDrivers(d as DriverRow[]);
      setAssignments(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onAssign = async (booking: BookingRow) => {
    if (!user?.id) return;
    const driverId = selectedDriver[booking.id];
    if (!driverId) {
      setError("Choisissez un chauffeur avant d’assigner.");
      return;
    }
    setBusyId(booking.id);
    setError(null);
    try {
      const trip = Array.isArray(booking.trip) ? booking.trip[0] : booking.trip;
      await assignDriverToBooking({
        bookingId: booking.id,
        driverId,
        assignedBy: user.id,
        tripId: booking.trip_id ?? trip?.id ?? null,
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Affectation impossible");
    } finally {
      setBusyId(null);
    }
  };

  const pending = bookings.filter(
    (b) => b.status === "pending" || !b.driver_id || b.status === "confirmed"
  );

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Dispatch</h1>
      <p className="mt-1 text-neutral-600">
        Assignez les réservations aux chauffeurs de la flotte SentraJet.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <h2 className="mt-6 text-lg font-semibold text-neutral-900">
        Réservations à traiter
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-neutral-500">Chargement…</p>
      ) : pending.length === 0 ? (
        <Card className="mt-3">
          <p className="text-sm text-neutral-500">Aucune réservation récente.</p>
        </Card>
      ) : (
        <div className="mt-3 space-y-3">
          {pending.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">{tripLabel(booking)}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {booking.passengers} passager{booking.passengers > 1 ? "s" : ""} ·{" "}
                    {(booking.billed_price_fcfa ?? booking.total_fcfa).toLocaleString("fr-FR")}{" "}
                    FCFA · statut {booking.status}
                    {booking.partner_id ? " · B2B" : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={selectedDriver[booking.id] ?? ""}
                    onChange={(e) =>
                      setSelectedDriver((prev) => ({
                        ...prev,
                        [booking.id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Chauffeur…</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name || d.phone || d.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busyId === booking.id}
                    onClick={() => onAssign(booking)}
                  >
                    {busyId === booking.id ? "…" : "Assigner"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Affectations récentes
      </h2>
      <div className="mt-3 space-y-2">
        {assignments.length === 0 ? (
          <Card>
            <p className="text-sm text-neutral-500">Aucune affectation pour l’instant.</p>
          </Card>
        ) : (
          assignments.map((a) => (
            <Card key={a.id}>
              <p className="text-sm font-medium text-neutral-900">
                {a.driver?.full_name || a.driver_id.slice(0, 8)} · {a.status}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {a.trip
                  ? `${a.trip.from_city} → ${a.trip.to_city}`
                  : a.booking_id
                    ? `Réservation ${a.booking_id.slice(0, 8)}`
                    : "Mission"}
                {" · "}
                {new Date(a.assigned_at).toLocaleString("fr-FR")}
              </p>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
