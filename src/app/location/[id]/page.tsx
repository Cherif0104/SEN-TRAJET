"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getRentalListingById, type RentalListing } from "@/lib/rentals";
import { Car, ShieldCheck, Fuel, Gauge, CalendarCheck } from "lucide-react";

export default function RentalListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<RentalListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    let mounted = true;
    getRentalListingById(params.id)
      .then((row) => {
        if (mounted) setListing(row);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <div className="h-64 animate-pulse rounded-2xl bg-neutral-200" />
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <Card>
            <h1 className="text-lg font-semibold text-neutral-900">Véhicule introuvable</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Cette offre n&apos;est plus disponible.
            </p>
            <Button href="/location" className="mt-4">
              Retour au catalogue
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/location" className="text-sm font-medium text-primary hover:underline">
          ← Retour aux véhicules
        </Link>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {listing.brand} {listing.model}
              </h1>
              <p className="mt-1 text-neutral-600">
                {listing.city} · {listing.pickup_location_label || "Point de prise en charge à confirmer"}
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 px-4 py-3 text-right">
              <p className="text-xs text-sky-700">Prix journalier</p>
              <p className="text-xl font-bold text-neutral-900">
                {listing.daily_rate_fcfa.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem icon={Car} label="Transmission" value={listing.transmission} />
            <InfoItem icon={Fuel} label="Carburant" value={listing.fuel_type} />
            <InfoItem icon={Gauge} label="Kilométrage" value={`${listing.mileage_km.toLocaleString("fr-FR")} km`} />
            <InfoItem icon={CalendarCheck} label="Année" value={listing.year ? String(listing.year) : "N/A"} />
          </div>
          <div className="mt-6 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
            <Spec label="Plaque" value={listing.plate_number} />
            <Spec label="Couleur" value={listing.color || "N/A"} />
            <Spec label="Moteur" value={listing.engine_size_l ? `${listing.engine_size_l}L` : "N/A"} />
            <Spec label="Sièges" value={`${listing.seats}`} />
            <Spec label="Climatisation" value={listing.has_air_conditioning ? "Oui" : "Non"} />
            <Spec label="Climatisation fonctionnelle" value={listing.ac_operational ? "Oui" : "Non"} />
            <Spec label="Airbags fonctionnels" value={listing.airbags_operational ? "Oui" : "Non"} />
            <Spec label="Ceintures fonctionnelles" value={listing.seatbelts_operational ? "Oui" : "Non"} />
            <Spec label="Roue de secours" value={listing.has_spare_tire ? "Oui" : "Non"} />
            <Spec
              label="Visite technique"
              value={listing.technical_inspection_valid_until || "Date non renseignée"}
            />
            <Spec label="Assurance" value={listing.insurance_valid_until || "Date non renseignée"} />
            <Spec label="Historique accident" value={listing.had_accident ? "Oui" : "Non"} />
          </div>
          {listing.had_accident && listing.accident_details && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {listing.accident_details}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => router.push(`/location/reserver?listing=${listing.id}`)}
              className="min-w-[220px]"
            >
              Réserver ce véhicule
            </Button>
            <Button href="/contact" variant="secondary">
              Contacter un agent
            </Button>
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Données techniques et conformité gérées par SEN TRAJET.
          </p>
        </section>
      </main>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Car; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="flex items-center gap-2 text-xs text-neutral-500">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-neutral-800">{label} :</span>{" "}
      <span>{value}</span>
    </p>
  );
}
