"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getMyRequests, type TripRequest } from "@/lib/requests";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";
import { MapPin, Calendar } from "lucide-react";

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
        Les demandes que vous avez publiées. Consultez les propositions des chauffeurs.
      </p>

      {loading ? (
        <div className="mt-6 animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-200" />
          ))}
        </div>
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
        <ul className="mt-6 space-y-3">
          {requests.map((req) => (
            <li key={req.id}>
              <Link href={`/demande/${req.id}`}>
                <Card variant="interactive" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {req.from_city} → {req.to_city}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(req.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span>{req.passengers} passager{req.passengers > 1 ? "s" : ""}</span>
                      <TripTypeBadge tripType={req.trip_type} />
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 capitalize">
                      {req.status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-primary">Voir les propositions →</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
