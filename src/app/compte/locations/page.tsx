"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { getClientRentalBookings, type RentalBooking } from "@/lib/rentals";
import { RENTAL_STATUS_LABEL, rentalStatusStyle } from "@/lib/statusLabels";

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
        Suivez l&apos;état de vos locations, les dates de remise et les actions de support.
      </p>

      {params.get("created") === "1" && (
        <FeedbackBanner
          className="mt-4"
          tone="success"
          message="Votre demande de location a été créée avec succès."
        />
      )}

      {loading ? (
        <ListSkeleton className="mt-6 animate-pulse space-y-3" items={2} itemClassName="h-28 rounded-xl bg-neutral-200" />
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
                    {formatDateFr(booking.start_date)} → {formatDateFr(booking.end_date)} · {booking.total_days} jour
                    {booking.total_days > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {booking.total_fcfa.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${rentalStatusStyle(booking.status)}`}
                >
                  {RENTAL_STATUS_LABEL[booking.status] ?? booking.status}
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

function formatDateFr(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function CompteLocationsPage() {
  return (
    <Suspense fallback={<div className="mt-6 h-24 animate-pulse rounded-xl bg-neutral-200" />}>
      <CompteLocationsPageContent />
    </Suspense>
  );
}
