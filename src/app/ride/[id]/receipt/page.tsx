"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { formatFare, RIDE_CLASSES } from "@/lib/fare";
import { supabase } from "@/lib/supabase";
import type { RideRequest } from "@/lib/types";

type DriverSummary = {
  full_name: string;
  vehicle: string | null;
  plate: string | null;
};

export default function RideReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<RideRequest | null>(null);
  const [driver, setDriver] = useState<DriverSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase
      .from("ride_requests")
      .select("*")
      .eq("id", id)
      .eq("status", "completed")
      .maybeSingle()
      .then(async ({ data }) => {
        if (!active) return;
        const completedRide = data as RideRequest | null;
        setRide(completedRide);
        if (completedRide?.driver_id) {
          const { data: driverData } = await supabase
            .from("driver_public_profiles")
            .select("full_name, vehicle, plate")
            .eq("id", completedRide.driver_id)
            .maybeSingle();
          if (active) setDriver(driverData as DriverSummary | null);
        }
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AuthGate role="client">
      <AppShell>
        <section className="receipt-page">
          <header className="receipt-header">
            <Link href="/history" aria-label="Retour à mes trajets"><ArrowLeft size={20} /></Link>
            <h1>Reçu de course</h1>
            <ReceiptText size={21} />
          </header>

          {loading ? <div className="card receipt-card">Chargement du reçu…</div> : null}
          {!loading && !ride ? <div className="card receipt-card">Ce reçu n’est pas disponible.</div> : null}

          {ride ? (
            <>
              <article className="card receipt-card">
                <div className="receipt-brand">SENTRAJET</div>
                <p className="eyebrow">Reçu {ride.receipt_number || ride.reference}</p>
                <h2>{formatFare(ride.final_fare ?? ride.estimated_fare)}</h2>
                <small className="muted">Payé en espèces · {ride.completed_at ? new Date(ride.completed_at).toLocaleString("fr-FR") : "Course terminée"}</small>

                <dl className="receipt-details">
                  <div><dt>Départ</dt><dd>{ride.pickup_address}</dd></div>
                  <div><dt>Destination</dt><dd>{ride.destination_address}</dd></div>
                  <div><dt>Distance / durée</dt><dd>{ride.distance_km} km · {ride.duration_minutes} min</dd></div>
                  <div><dt>Véhicule</dt><dd>{RIDE_CLASSES[ride.ride_class].label}{driver?.vehicle ? ` · ${driver.vehicle}` : ""}</dd></div>
                  <div><dt>Chauffeur</dt><dd>{driver?.full_name || "Chauffeur SentraJet"}{driver?.plate ? ` · ${driver.plate}` : ""}</dd></div>
                  <div><dt>Référence</dt><dd>{ride.reference}</dd></div>
                </dl>

                <div className="receipt-total">
                  <span>Total payé</span>
                  <strong>{formatFare(ride.final_fare ?? ride.estimated_fare)}</strong>
                </div>
              </article>
              <button className="primary-button print-hidden" type="button" onClick={() => window.print()}>
                <Download size={18} /> Imprimer ou enregistrer en PDF
              </button>
            </>
          ) : null}
        </section>
      </AppShell>
    </AuthGate>
  );
}
