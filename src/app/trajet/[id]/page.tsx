"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TripLiveMap } from "@/components/map/TripLiveMap";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";
import { VehicleBadge } from "@/components/ui/VehicleBadge";
import { fetchTripById } from "@/lib/fetchTrip";

export default function TrajetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [trip, setTrip] = useState<Awaited<ReturnType<typeof fetchTripById>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTripById(id).then((data) => {
      setTrip(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 rounded bg-neutral-200" />
            <div className="h-48 rounded-xl bg-neutral-200" />
            <div className="h-24 rounded-xl bg-neutral-200" />
            <div className="h-32 rounded-xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
          <Card className="py-12 text-center">
            <h2 className="text-lg font-semibold text-neutral-900">
              Trajet introuvable
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Ce trajet n’existe pas ou n’est plus disponible.
            </p>
            <Button href="/recherche" className="mt-4">
              Rechercher un trajet
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const fromCity = trip.fromCity;
  const toCity = trip.toCity;
  const departurePlace = trip.fromPlace || trip.fromCity;
  const arrivalPlace = trip.toPlace || trip.toCity;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <Link
          href="/recherche"
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux résultats
        </Link>

        <TripLiveMap
          tripId={id}
          fromCity={fromCity}
          toCity={toCity}
          userRole="client"
          className="mb-6"
        />

        <section className="rounded-xl bg-white p-4 shadow-card border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {trip.driverName.charAt(0) || "C"}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{trip.driverName}</p>
              <p className="flex items-center gap-1 text-sm text-neutral-600">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {trip.rating > 0 ? trip.rating.toFixed(1) : "—"} · {trip.reviews} avis
              </p>
              <div className="flex items-center gap-2 mt-1">
                <TripTypeBadge tripType={trip.tripType} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-4 shadow-card border border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Itinéraire</h3>
          <div className="mt-3 flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <div className="w-px flex-1 bg-neutral-300 my-1" />
              <div className="h-3 w-3 rounded-full bg-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{departurePlace}</p>
              <p className="text-sm text-neutral-500">{trip.departureTime}</p>
              <div className="my-2 h-px bg-neutral-100" />
              <p className="font-medium text-neutral-900">{arrivalPlace}</p>
              <p className="text-sm text-neutral-500">{trip.arrivalTime}</p>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 text-sm text-neutral-600">
            <MapPin className="h-4 w-4" />
            {trip.distanceKm} km · {trip.durationLabel}
          </p>
        </section>

        <section className="mt-6 rounded-xl bg-white p-4 shadow-card border border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Véhicule</h3>
          <div className="mt-2">
            <VehicleBadge
              name={trip.vehicleName}
              category={trip.vehicleCategory}
              seats={trip.totalSeats}
            />
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {trip.availableSeats}/{trip.totalSeats} places encore disponibles
          </p>
        </section>

        <section className="mt-6 rounded-xl bg-white p-4 shadow-card border border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Tarification</h3>
          <p className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-lg font-bold">
            <span>Prix par personne</span>
            <span>{trip.priceFcfa.toLocaleString("fr-FR")} FCFA</span>
          </p>
        </section>

        <div className="sticky bottom-0 mt-8 pb-6">
          <Button
            fullWidth
            size="lg"
            href={`/reservation?trajet=${id}`}
          >
            Réserver maintenant
          </Button>
        </div>
      </main>
    </div>
  );
}
