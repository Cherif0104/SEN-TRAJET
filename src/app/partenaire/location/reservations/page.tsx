"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getPartnerByUserId } from "@/lib/partners";
import { getOwnerRentalBookings, getPartnerRentalBookings, type RentalBooking } from "@/lib/rentals";
import { RENTAL_STATUS_LABEL, rentalStatusStyle } from "@/lib/statusLabels";
import { CheckCircle2 } from "lucide-react";

const RENTAL_SETUP_AVAILABILITY_KEY = "sentrajet_rental_setup_availability_seen";

export default function PartenaireLocationReservationsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [rows, setRows] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const fromSetup = searchParams.get("setup") === "1";

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RENTAL_SETUP_AVAILABILITY_KEY, "1");
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const partner = await getPartnerByUserId(user.id);
        const data = partner
          ? await getPartnerRentalBookings(partner.id)
          : await getOwnerRentalBookings(user.id);
        if (mounted) setRows(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Réservations location</h1>
      <p className="mt-1 text-neutral-600">Suivez les locations confirmées, actives et clôturées.</p>

      {fromSetup && (
        <Card className="mt-4 border border-emerald-200 bg-emerald-50/40">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Étape validée: disponibilités consultées
          </p>
          <p className="mt-1 text-xs text-emerald-800/90">
            Retournez à la flotte pour voir votre progression complète 3/3.
          </p>
          <Button size="sm" variant="secondary" href="/partenaire/location/vehicules?setup=1" className="mt-3">
            Retour au parcours express
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="mt-6 border border-neutral-200">
          <p className="text-sm text-neutral-600">Aucune réservation location pour l’instant.</p>
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
                    Total: {booking.total_fcfa.toLocaleString("fr-FR")} FCFA · Net:{" "}
                    {booking.owner_net_fcfa.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${rentalStatusStyle(booking.status)}`}>
                  {RENTAL_STATUS_LABEL[booking.status] ?? booking.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
