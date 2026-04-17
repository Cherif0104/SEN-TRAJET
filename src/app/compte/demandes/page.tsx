"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { getMyRequests, type TripRequest } from "@/lib/requests";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";
import { Calendar, Clock3 } from "lucide-react";
import { REQUEST_STATUS_LABEL, requestStatusStyle } from "@/lib/statusLabels";

export default function CompteDemandesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getMyRequests(user.id)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mes demandes</h1>
      <p className="mt-1 text-neutral-600">
        Retrouvez vos demandes publiées et ouvrez chaque fiche pour comparer les propositions chauffeurs.
      </p>

      {loading ? (
        <ListSkeleton className="mt-6 animate-pulse space-y-3" />
      ) : requests.length === 0 ? (
        <Card className="mt-6 py-12 text-center">
          <p className="text-neutral-600">Aucune demande</p>
          <p className="mt-1 text-sm text-neutral-500">
            Publiez une demande si aucun trajet ne correspond à vos dates.
          </p>
          <Button href="/demande" className="mt-4">
            Créer une demande
          </Button>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="rounded-3xl border border-neutral-200 bg-neutral-50">
              <p className="text-xs text-neutral-500">Total demandes</p>
              <p className="text-xl font-bold text-neutral-900">{requests.length}</p>
            </Card>
            <Card className="rounded-3xl border border-emerald-200 bg-emerald-50">
              <p className="text-xs text-emerald-700">Ouvertes</p>
              <p className="text-xl font-bold text-emerald-800">
                {requests.filter((r) => r.status === "open").length}
              </p>
            </Card>
            <Card className="rounded-3xl border border-sky-200 bg-sky-50">
              <p className="text-xs text-sky-700">Avec progression</p>
              <p className="text-xl font-bold text-sky-800">
                {requests.filter((r) => r.status === "matched").length}
              </p>
            </Card>
          </div>

          <ul className="mt-4 space-y-3">
          {requests.map((req) => (
            <li key={req.id}>
              <Link href={`/demande/${req.id}`}>
                <Card variant="interactive" className="rounded-3xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {req.from_city} → {req.to_city}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(req.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {req.trip_type !== "colis" && (
                        <span>{req.passengers} passager{req.passengers > 1 ? "s" : ""}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {req.departure_time_range}
                      </span>
                      <TripTypeBadge tripType={req.trip_type} />
                    </div>
                    {req.trip_type === "colis" && (
                      <p className="mt-1 text-xs text-neutral-600">
                        {(req.parcel_quantity ?? 1)} colis · {req.parcel_weight_kg ?? "?"} kg ·{" "}
                        {req.is_fragile ? "Fragile" : "Standard"}
                      </p>
                    )}
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        requestStatusStyle(req.status)
                      }`}
                    >
                      {REQUEST_STATUS_LABEL[req.status] ?? req.status}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">Voir les propositions</span>
                </Card>
              </Link>
            </li>
          ))}
          </ul>
        </>
      )}
    </>
  );
}
