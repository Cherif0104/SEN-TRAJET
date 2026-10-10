"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { RideRequest } from "@/lib/types";

export default function HistoryPage() {
  const [rides, setRides] = useState<RideRequest[]>([]);

  useEffect(() => {
    void supabase.from("ride_requests").select("*").order("created_at", { ascending: false }).limit(30).then(({ data }) => {
      setRides((data as RideRequest[]) || []);
    });
  }, []);

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "14px 18px 28px" }}>
          <p className="eyebrow">Activité</p>
          <h1 className="page-title">Mes trajets</h1>
          <div style={{ display: "grid", gap: 11, marginTop: 24 }}>
            {rides.map((ride) => (
              <article className="card" key={ride.id} style={{ padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "flex", gap: 7, alignItems: "center" }}><MapPin size={16} color="var(--gold-deep)" /> {ride.destination_address}</strong>
                    <small className="muted" style={{ display: "block", marginTop: 7 }}>{new Date(ride.created_at).toLocaleString("fr-FR")} · {ride.distance_km} km</small>
                  </div>
                  <strong style={{ whiteSpace: "nowrap" }}>{formatFare(ride.estimated_fare)}</strong>
                </div>
              </article>
            ))}
            {!rides.length ? <div className="card" style={{ padding: 24, textAlign: "center" }}><p className="muted">Aucun trajet pour le moment.</p></div> : null}
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
