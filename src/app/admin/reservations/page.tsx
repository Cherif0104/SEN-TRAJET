 "use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getAllRentalBookings, type RentalBooking } from "@/lib/rentals";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmée",
  active: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export default function AdminReservationsPage() {
  const [rows, setRows] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRentalBookings()
      .then((data) => setRows(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Réservations</h1>
      <p className="mt-1 text-neutral-600">Suivi des réservations location et reversements.</p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-neutral-600">Aucune réservation location enregistrée.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((booking) => (
            <Card key={booking.id} className="border border-neutral-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    {booking.listing?.brand} {booking.listing?.model}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Client: {booking.client?.full_name || "N/A"} · {booking.start_date} → {booking.end_date}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Total: {booking.total_fcfa.toLocaleString("fr-FR")} FCFA · Net propriétaire:{" "}
                    {booking.owner_net_fcfa.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {STATUS_LABEL[booking.status] ?? booking.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
