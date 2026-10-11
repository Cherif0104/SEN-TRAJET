"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatFare, RIDE_CLASSES } from "@/lib/fare";
import type { RideRequest } from "@/lib/types";

type Filter = "all" | "completed" | "upcoming" | "cancelled";
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "completed", label: "Terminés" },
  { value: "upcoming", label: "À venir" },
  { value: "cancelled", label: "Annulés" }
];

export default function HistoryPage() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    void supabase.from("ride_requests").select("*").order("created_at", { ascending: false }).limit(50).then(async ({ data }) => {
      const nextRides = (data as RideRequest[]) || [];
      setRides(nextRides);
      if (!nextRides.length) return;
      const { data: ratingData } = await supabase
        .from("ride_ratings")
        .select("ride_request_id, rating")
        .in("ride_request_id", nextRides.map((ride) => ride.id));
      setRatings(Object.fromEntries((ratingData || []).map((item) => [item.ride_request_id, item.rating])));
    });
  }, []);

  const visibleRides = useMemo(() => rides.filter((ride) => {
    if (filter === "completed") return ride.status === "completed";
    if (filter === "cancelled") return ride.status === "cancelled";
    if (filter === "upcoming") return ["scheduled", "searching", "offered", "assigned", "driver_en_route", "driver_arrived", "passenger_on_board"].includes(ride.status);
    return true;
  }), [filter, rides]);

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "14px 18px 28px" }}>
          <p className="eyebrow">Activité</p>
          <h1 className="page-title">Mes trajets</h1>
          <div className="history-filters" role="tablist" aria-label="Filtrer les trajets">
            {FILTERS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gap: 11, marginTop: 24 }}>
            {visibleRides.map((ride) => (
              <article className="card" key={ride.id} style={{ padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <small className="muted" style={{ display: "block" }}>{ride.pickup_address}</small>
                    <strong style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 5 }}><MapPin size={16} color="var(--gold-deep)" /> {ride.destination_address}</strong>
                    <small className="muted" style={{ display: "block", marginTop: 7 }}>{new Date(ride.scheduled_for || ride.created_at).toLocaleString("fr-FR")} · {RIDE_CLASSES[ride.ride_class].label} · {ride.distance_km} km</small>
                    <span className={`ride-status ride-status-${ride.status}`}>{statusLabel(ride.status)}</span>
                    {ratings[ride.id] ? <small style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 7 }}><Star size={13} fill="var(--gold)" color="var(--gold-deep)" /> {ratings[ride.id]}/5</small> : null}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ whiteSpace: "nowrap" }}>{formatFare(ride.final_fare ?? ride.estimated_fare)}</strong>
                    {ride.status === "completed" ? <Link href={`/ride/${ride.id}/receipt`} aria-label={`Voir le reçu ${ride.reference}`} style={{ width: 34, height: 34, margin: "10px 0 0 auto", borderRadius: 12, background: "#eef8f4", color: "var(--green)", display: "grid", placeItems: "center" }}><ArrowRight size={16} /></Link> : null}
                  </div>
                </div>
              </article>
            ))}
            {!visibleRides.length ? <div className="card" style={{ padding: 24, textAlign: "center" }}><p className="muted">Aucun trajet dans cette catégorie.</p></div> : null}
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}

function statusLabel(status: RideRequest["status"]) {
  const labels: Record<RideRequest["status"], string> = {
    draft: "Brouillon",
    scheduled: "À venir",
    searching: "Recherche",
    offered: "Proposé",
    assigned: "Chauffeur attribué",
    driver_en_route: "Chauffeur en route",
    driver_arrived: "Chauffeur arrivé",
    passenger_on_board: "En cours",
    completed: "Terminé",
    cancelled: "Annulé",
    no_driver: "Aucun chauffeur"
  };
  return labels[status];
}
