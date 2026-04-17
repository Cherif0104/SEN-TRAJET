"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Users, Clock, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";
import { ProposalList } from "@/components/proposal/ProposalList";
import { useAuth } from "@/hooks/useAuth";
import { useProposals } from "@/hooks/useProposals";
import { getRequestById, cancelRequest, type TripRequest } from "@/lib/requests";

export default function DemandeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { user } = useAuth();

  const [request, setRequest] = useState<TripRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const { proposals, loading: proposalsLoading, refresh } = useProposals(requestId);

  useEffect(() => {
    getRequestById(requestId)
      .then(setRequest)
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [requestId]);

  const isOwner = user?.id === request?.client_id;

  const handleCancel = async () => {
    setCancelling(true);
    await cancelRequest(requestId);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-neutral-200" />
            <div className="h-40 rounded-xl bg-neutral-200" />
            <div className="h-32 rounded-xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <Card className="py-12 text-center">
            <h2 className="text-lg font-semibold text-neutral-900">
              Demande introuvable
            </h2>
            <Button href="/" className="mt-4">
              Retour
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const isOpen = request.status === "open";
  const isMatched = request.status === "matched";
  const isColis = request.trip_type === "colis";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {request.from_city} → {request.to_city}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
              <TripTypeBadge tripType={request.trip_type} />
              {isOpen && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  En cours
                </span>
              )}
              {isMatched && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Réservé
                </span>
              )}
              {request.status === "cancelled" && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                  Annulée
                </span>
              )}
            </div>
          </div>
          {isOwner && isOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelling}
            >
              Annuler
            </Button>
          )}
        </div>

        <Card className="mt-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-neutral-600">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span>
                {request.from_city} → {request.to_city}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
              <span>
                {new Date(request.departure_date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="capitalize">{request.departure_time_range}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              {isColis ? (
                <>
                  <Package className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {request.parcel_quantity ?? 1} colis
                    {(request.parcel_quantity ?? 1) > 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {request.passengers} passager
                    {request.passengers > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
          {isColis && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">Détails colis</p>
              <p className="mt-1">
                Type: {request.parcel_type || "Non précisé"} · Poids:{" "}
                {request.parcel_weight_kg != null ? `${request.parcel_weight_kg} kg` : "Non précisé"}
              </p>
              <p className="mt-1">
                Volume: {request.parcel_volume_label || "Non précisé"} · Fragile: {request.is_fragile ? "Oui" : "Non"}
              </p>
              <p className="mt-1">
                Mode: {request.colis_dispatch_mode === "depot_assiste" ? "Dépôt assisté" : "Direct trajet"} · Urgence:{" "}
                {request.urgency_level}
              </p>
              <p className="mt-1">
                Véhicule souhaité: {request.requested_vehicle_category || request.preferred_vehicle_type || "Non précisé"}
              </p>
              <p className="mt-1">
                Classe souhaitée: {request.requested_service_class || "Non précisé"}
              </p>
              <p className="mt-1">
                Retrait: {request.pickup_address || "Non précisé"}
              </p>
              <p className="mt-1">
                Livraison: {request.delivery_address || "Non précisé"}
              </p>
              {request.relay_dropoff_label && (
                <p className="mt-1">
                  Dépôt/relais: {request.relay_dropoff_label}
                </p>
              )}
              {request.support_callback_requested && (
                <p className="mt-1 font-medium text-sky-800">
                  Rappel support demandé
                </p>
              )}
              {request.declared_value_fcfa != null && (
                <p className="mt-1">
                  Valeur déclarée: {request.declared_value_fcfa.toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>
          )}
          {request.notes && (
            <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {request.notes}
            </p>
          )}
        </Card>

        <h2 className="mt-8 text-lg font-semibold text-neutral-900">
          Propositions des chauffeurs
          {!proposalsLoading && proposals.length > 0 && (
            <span className="ml-2 text-sm font-normal text-neutral-400">
              ({proposals.length})
            </span>
          )}
        </h2>

        {isOpen && isOwner && (
          <p className="mt-1 text-sm text-neutral-500">
            Les propositions apparaissent ici en temps réel. Acceptez celle qui
            vous convient.
          </p>
        )}

        <div className="mt-4">
          {proposalsLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-28 rounded-xl bg-neutral-200" />
              <div className="h-28 rounded-xl bg-neutral-200" />
            </div>
          ) : (
            <ProposalList
              proposals={proposals}
              isOwner={isOwner}
              clientId={user?.id}
              currentUserId={user?.id}
              onUpdate={refresh}
              onAccepted={() => router.push("/compte/reservations")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
