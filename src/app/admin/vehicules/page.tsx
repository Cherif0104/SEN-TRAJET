 "use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  getRentalListings,
  revalidateRentalListingClass,
  updateRentalListingStatus,
  type RentalListing,
  type ServiceClassLevel,
} from "@/lib/rentals";

export default function AdminVehiculesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [classByVehicle, setClassByVehicle] = useState<Record<string, ServiceClassLevel>>({});

  const refresh = () => {
    setLoading(true);
    getRentalListings()
      .then((data) => {
        setRows(data);
        setClassByVehicle(
          Object.fromEntries(
            data.map((vehicle) => [vehicle.id, vehicle.service_class])
          ) as Record<string, ServiceClassLevel>
        );
      })
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

  const revalidateClass = async (id: string) => {
    if (!user?.id) return;
    const nextClass = classByVehicle[id];
    if (!nextClass) return;
    setProcessingId(id);
    try {
      await revalidateRentalListingClass({
        listingId: id,
        serviceClass: nextClass,
        validatorProfileId: user.id,
      });
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
                    {vehicle.transport_vehicle_category} · {vehicle.service_class} ·{" "}
                    {vehicle.rental_mode === "with_driver" ? "Avec chauffeur" : "Sans chauffeur"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Statut: {vehicle.status} · Eligibilité: {vehicle.eligibility_status} · Vérifié:{" "}
                    {vehicle.is_verified ? "Oui" : "Non"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Score conformité: {vehicle.compliance_score ?? 0}/100
                  </p>
                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-medium text-neutral-700">
                      Classe à valider
                    </label>
                    <select
                      value={classByVehicle[vehicle.id] ?? vehicle.service_class}
                      onChange={(e) =>
                        setClassByVehicle((prev) => ({
                          ...prev,
                          [vehicle.id]: e.target.value as ServiceClassLevel,
                        }))
                      }
                      className="min-h-[34px] rounded-lg border border-neutral-300 bg-white px-2 text-xs"
                    >
                      <option value="eco">Eco</option>
                      <option value="confort">Confort</option>
                      <option value="confort_plus">Confort+</option>
                      <option value="premium">Premium</option>
                      <option value="premium_plus">Premium+</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => revalidateClass(vehicle.id)}
                    disabled={processingId === vehicle.id}
                  >
                    Revalider classe
                  </Button>
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
