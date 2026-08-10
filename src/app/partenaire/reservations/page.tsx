"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getPartnerByUserId } from "@/lib/partners";
import { supabase } from "@/lib/supabase";
import { Search } from "lucide-react";

type PartnerBooking = {
  id: string;
  status: string;
  total_fcfa: number;
  billed_price_fcfa: number | null;
  passengers: number;
  created_at: string;
  trip?:
    | {
        from_city: string;
        to_city: string;
        departure_time: string;
      }
    | {
        from_city: string;
        to_city: string;
        departure_time: string;
      }[]
    | null;
};

export default function PartenaireReservationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const partner = await getPartnerByUserId(user.id);
        if (!partner) {
          setRows([]);
          return;
        }
        const { data, error: qError } = await supabase
          .from("bookings")
          .select(
            "id, status, total_fcfa, billed_price_fcfa, passengers, created_at, trip:trips(from_city, to_city, departure_time)"
          )
          .eq("partner_id", partner.id)
          .order("created_at", { ascending: false });
        if (qError) throw qError;
        setRows((data ?? []) as PartnerBooking[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Mes réservations</h1>
          <p className="mt-1 text-neutral-600">
            Trajets réservés au nom de votre organisation.
          </p>
        </div>
        <Button variant="primary" size="sm" href="/recherche">
          <Search className="mr-2 h-4 w-4" /> Nouvelle réservation
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-neutral-600">
            Aucune réservation partenaire pour l’instant.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" href="/recherche">
            Réserver un trajet
          </Button>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const trip = Array.isArray(row.trip) ? row.trip[0] : row.trip;
            const price = row.billed_price_fcfa ?? row.total_fcfa;
            return (
              <Card key={row.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {trip
                        ? `${trip.from_city} → ${trip.to_city}`
                        : "Trajet"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {trip?.departure_time
                        ? new Date(trip.departure_time).toLocaleString("fr-FR")
                        : new Date(row.created_at).toLocaleString("fr-FR")}
                      {" · "}
                      {row.passengers} passager{row.passengers > 1 ? "s" : ""}
                      {" · "}
                      {price.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">{row.status}</span>
                </div>
                <Link
                  href={`/messages/${row.id}`}
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Ouvrir le suivi
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
