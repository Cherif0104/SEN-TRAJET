"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Utensils } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { FoodOrder, RideRequest } from "@/lib/types";

export default function HistoryPage() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [tab, setTab] = useState<"rides" | "food">("rides");

  useEffect(() => {
    void Promise.all([
      supabase.from("ride_requests").select("*").order("created_at", { ascending: false }).limit(30),
      supabase
        .from("food_orders")
        .select("id, reference, client_id, restaurant_id, courier_driver_id, status, restaurant_status, delivery_status, delivery_mode, payment_method, payment_status, subtotal, delivery_fee, service_fee, total, delivery_address, recipient_name, recipient_phone, customer_notes, estimated_ready_at, created_at, restaurant:restaurants(name, address)")
        .order("created_at", { ascending: false })
        .limit(30)
    ]).then(([rideResult, foodResult]) => {
      setRides((rideResult.data as RideRequest[]) || []);
      setFoodOrders((foodResult.data as unknown as FoodOrder[]) || []);
    });
  }, []);

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "14px 18px 28px" }}>
          <p className="eyebrow">Activité</p>
          <h1 className="page-title">Mes commandes</h1>
          <div className="activity-tabs">
            <button type="button" className={tab === "rides" ? "active" : ""} onClick={() => setTab("rides")}>Trajets</button>
            <button type="button" className={tab === "food" ? "active" : ""} onClick={() => setTab("food")}>Restaurants</button>
          </div>
          <div style={{ display: "grid", gap: 11, marginTop: 24 }}>
            {tab === "rides" ? rides.map((ride) => (
              <article className="card" key={ride.id} style={{ padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "flex", gap: 7, alignItems: "center" }}><MapPin size={16} color="var(--gold-deep)" /> {ride.destination_address}</strong>
                    <small className="muted" style={{ display: "block", marginTop: 7 }}>{new Date(ride.created_at).toLocaleString("fr-FR")} · {ride.distance_km} km</small>
                  </div>
                  <strong style={{ whiteSpace: "nowrap" }}>{formatFare(ride.estimated_fare)}</strong>
                </div>
              </article>
            )) : foodOrders.map((order) => (
              <Link className="card activity-food-order" href={`/food/orders/${order.id}`} key={order.id}>
                <span><Utensils /></span>
                <div><strong>{order.restaurant?.name || "SentraJet Food"}</strong><small>{order.reference} · {order.status.replace("_", " ")}</small></div>
                <div><strong>{formatFare(order.total)}</strong><ChevronRight /></div>
              </Link>
            ))}
            {tab === "rides" && !rides.length ? <div className="card" style={{ padding: 24, textAlign: "center" }}><p className="muted">Aucun trajet pour le moment.</p></div> : null}
            {tab === "food" && !foodOrders.length ? <div className="card" style={{ padding: 24, textAlign: "center" }}><p className="muted">Aucune commande restaurant pour le moment.</p></div> : null}
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
