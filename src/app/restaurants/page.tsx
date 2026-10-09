"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Store, Utensils } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  menu_items: Array<{ id: string; name: string; description: string | null; price: number }>;
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    void supabase
      .from("restaurants")
      .select("id, name, description, address, menu_items(id, name, description, price)")
      .eq("is_active", true)
      .then(({ data }) => setRestaurants((data as Restaurant[]) || []));
  }, []);

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "12px 18px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/app" style={{ width: 43, height: 43, borderRadius: 15, background: "white", border: "1px solid var(--line)", display: "grid", placeItems: "center" }}><ArrowLeft size={20} /></Link>
            <div><p className="eyebrow">SentraJet Food</p><h1 style={{ margin: "3px 0 0", fontSize: 22 }}>Restaurants</h1></div>
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
            {restaurants.map((restaurant) => (
              <article key={restaurant.id} className="card" style={{ overflow: "hidden" }}>
                <div style={{ minHeight: 110, padding: 17, background: "linear-gradient(145deg,var(--ink),#19314d)", color: "white" }}>
                  <Store color="var(--gold)" />
                  <h2 style={{ margin: "18px 0 0" }}>{restaurant.name}</h2>
                  <small style={{ color: "#aeb9c8" }}>{restaurant.address}</small>
                </div>
                <div style={{ padding: 14, display: "grid", gap: 9 }}>
                  {restaurant.menu_items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                      <div><strong>{item.name}</strong><small className="muted" style={{ display: "block", marginTop: 3 }}>{item.description}</small></div>
                      <strong style={{ whiteSpace: "nowrap" }}>{formatFare(item.price)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!restaurants.length ? (
              <div className="card" style={{ padding: 26, textAlign: "center" }}>
                <Utensils size={36} color="var(--gold-deep)" />
                <h2>Les restaurants arrivent</h2>
                <p className="muted">Les premiers partenaires publieront bientôt leurs menus.</p>
              </div>
            ) : null}
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
