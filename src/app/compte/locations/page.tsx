"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getClientRentalBookings, type RentalBooking } from "@/lib/rentals";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmée",
  active: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

function CompteLocationsPageContent() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    getClientRentalBookings(user.id)
      .then((rows) => {
        if (mounted) setBookings(rows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Mes locations</h1>
      <p className="mt-1 text-neutral-600">
        Suivez vos réservations de véhicules.
      </p>

      {params.get("created") === "1" && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Votre demande de location a été créée avec succès.
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2].map((idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-neutral-900">Aucune location pour l’instant</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Parcourez les véhicules disponibles pour lancer votre première location.
          </p>
          <Button href="/location" className="mt-4">
            Voir les véhicules
          </Button>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border border-neutral-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    {booking.listing?.brand} {booking.listing?.model}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    {booking.start_date} → {booking.end_date} · {booking.total_days} jour
                    {booking.total_days > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {booking.total_fcfa.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {STATUS_LABEL[booking.status] ?? booking.status}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button href={`/location/${booking.listing_id}`} variant="ghost" size="sm">
                  Revoir le véhicule
                </Button>
                <Link href="/messages" className="text-sm font-medium text-primary hover:underline">
                  Contacter le support
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default function CompteLocationsPage() {
  return (
    <Suspense fallback={<div className="mt-6 h-24 animate-pulse rounded-xl bg-neutral-200" />}>
      <CompteLocationsPageContent />
    </Suspense>
  );
}
