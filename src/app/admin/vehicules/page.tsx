 "use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getRentalListings, updateRentalListingStatus, type RentalListing } from "@/lib/rentals";

export default function AdminVehiculesPage() {
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    getRentalListings()
      .then((data) => setRows(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const setStatus = async (id: string, status: "active" | "rejected" | "paused") => {
    setProcessingId(id);
    try {
      await updateRentalListingStatus(id, status);
      refresh();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Véhicules</h1>
      <p className="mt-1 text-neutral-600">Gestion de la flotte location et conformité.</p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-neutral-600">Aucun véhicule location publié pour le moment.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((vehicle) => (
            <Card key={vehicle.id} className="border border-neutral-200">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    {vehicle.brand} {vehicle.model} · {vehicle.plate_number}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    {vehicle.city} · {vehicle.daily_rate_fcfa.toLocaleString("fr-FR")} FCFA/jour
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Statut: {vehicle.status} · Vérifié: {vehicle.is_verified ? "Oui" : "Non"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setStatus(vehicle.id, "active")}
                    disabled={processingId === vehicle.id}
                  >
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setStatus(vehicle.id, "paused")}
                    disabled={processingId === vehicle.id}
                  >
                    Suspendre
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus(vehicle.id, "rejected")}
                    disabled={processingId === vehicle.id}
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
