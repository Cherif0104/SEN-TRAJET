"use client";

import { useEffect, useState } from "react";
import { MapPin, Calendar, Users, Send, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";
import { useAuth } from "@/hooks/useAuth";
import { getOpenRequestsForDriver, type TripRequest } from "@/lib/requests";
import { sendProposal } from "@/lib/proposals";
import { getDriverVehicles } from "@/lib/profiles";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  seats: number;
};

export default function DemandesOuvertesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("");

  useEffect(() => {
    if (user) {
      getOpenRequestsForDriver(user.id)
        .then(setRequests)
        .catch(() => setFetchError("Impossible de charger les demandes pour le moment."))
        .finally(() => setLoading(false));
      getDriverVehicles(user.id)
        .then((v) => {
          setVehicles(v as Vehicle[]);
          if (v.length > 0) setVehicleId(v[0].id);
        })
        .catch(() => setFetchError("Impossible de charger vos véhicules."));
    } else {
      setLoading(false);
    }
  }, [user]);

  const filteredRequests = requests.filter((req) => {
    const fromOk = fromFilter ? req.from_city.toLowerCase().includes(fromFilter.toLowerCase()) : true;
    const toOk = toFilter ? req.to_city.toLowerCase().includes(toFilter.toLowerCase()) : true;
    const typeOk = requestTypeFilter ? req.trip_type === requestTypeFilter : true;
    return fromOk && toOk && typeOk;
  });

  const handleSend = async (requestId: string) => {
    const numericPrice = Number(price);
    if (!user || !price) return;
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setErrorMessage("Veuillez saisir un prix valide (supérieur à 0).");
      return;
    }
    setErrorMessage(null);
    setSending(true);
    try {
      await sendProposal({
        requestId,
        driverId: user.id,
        vehicleId: vehicleId || undefined,
        priceFcfa: numericPrice,
        message: message || undefined,
      });
      setSentIds((prev) => new Set(prev).add(requestId));
      setActiveId(null);
      setPrice("");
      setMessage("");
    } catch (err) {
      console.error("Erreur envoi proposition:", err);
      setErrorMessage("Impossible d'envoyer la proposition pour le moment.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
        <ListSkeleton
          className="mt-4 animate-pulse space-y-4"
          itemClassName="h-32 rounded-xl bg-neutral-200"
        />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">
        Demandes ouvertes
      </h1>
      <p className="mt-1 text-neutral-600">Feed ciblé selon votre zone et vos véhicules.</p>
      {errorMessage && <FeedbackBanner className="mt-4" tone="error" message={errorMessage} />}
      {fetchError && <FeedbackBanner className="mt-4" tone="warning" message={fetchError} />}
      <Card className="mt-4 border border-neutral-200 bg-neutral-50">
        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            label="Filtre départ"
            placeholder="Dakar"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
          />
          <Input
            label="Filtre destination"
            placeholder="Thiès"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">Type</label>
            <select
              value={requestTypeFilter}
              onChange={(e) => setRequestTypeFilter(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tous</option>
              <option value="interurbain_covoiturage">Covoiturage</option>
              <option value="interurbain_location">Location privée</option>
              <option value="colis">Colis</option>
              <option value="urbain">Urbain</option>
              <option value="aeroport">Aéroport</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setFromFilter("");
                setToFilter("");
                setRequestTypeFilter("");
              }}
            >
              Réinitialiser filtres
            </Button>
          </div>
        </div>
      </Card>
      {sentIds.size > 0 && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {sentIds.size} proposition{sentIds.size > 1 ? "s" : ""} envoyée{sentIds.size > 1 ? "s" : ""} pendant cette session.
        </p>
      )}

      {filteredRequests.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-neutral-500">
            Aucune demande ouverte pour ces filtres. Essayez d&apos;élargir la recherche.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredRequests.map((req) => {
            const isSent = sentIds.has(req.id);
            const isActive = activeId === req.id;

            return (
              <Card key={req.id} variant="interactive">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {req.from_city} → {req.to_city}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(req.departure_date).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short" }
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {req.passengers}p
                      </span>
                      <TripTypeBadge tripType={req.trip_type} />
                    </div>
                    {req.notes && (
                      <p className="mt-2 text-sm text-neutral-600 italic">
                        {req.notes}
                      </p>
                    )}
                    {req.budget_fcfa && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Budget client: {req.budget_fcfa.toLocaleString("fr-FR")} FCFA
                      </p>
                    )}
                  </div>
                  {req.client && (
                    <p className="text-sm text-neutral-500">
                      {req.client.full_name}
                    </p>
                  )}
                </div>

                {isSent ? (
                  <p className="mt-3 text-sm font-medium text-green-600">
                    Proposition envoyée
                  </p>
                ) : isActive ? (
                  <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                    <Input
                      label="Votre prix (FCFA)"
                      type="number"
                      placeholder="5000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                    {vehicles.length > 1 && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-neutral-800">
                          Véhicule
                        </label>
                        <select
                          value={vehicleId}
                          onChange={(e) => setVehicleId(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.brand} {v.model} ({v.seats}p)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-800">
                        Message (optionnel)
                      </label>
                      <textarea
                        className="w-full min-h-[60px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Véhicule climatisé, départ à 8h..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSend(req.id)}
                        isLoading={sending}
                        disabled={!price}
                      >
                        <Send className="mr-1 h-4 w-4" /> Envoyer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveId(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => setActiveId(req.id)}
                  >
                    <Search className="mr-1 h-4 w-4" /> Proposer un prix
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
