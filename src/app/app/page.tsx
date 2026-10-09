"use client";

import Link from "next/link";
import { ArrowUpRight, Bike, CarFront, Clock3, Package, Plane, Utensils } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";

export default function ClientHomePage() {
  const { profile } = useAuth();

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "12px 18px 26px" }}>
          <p className="eyebrow">Bonjour {profile?.full_name?.split(" ")[0] || ""}</p>
          <h1 className="page-title">Que souhaitez-vous faire ?</h1>
          <p className="muted" style={{ marginTop: 9 }}>Votre chauffeur ou livreur, suivi en direct.</p>

          <div className="service-grid" style={{ marginTop: 24 }}>
            <Link href="/ride?service=ride" className="service-card large">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="service-icon" style={{ background: "var(--ink)", color: "var(--gold)" }}><CarFront /></span>
                <ArrowUpRight />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 25 }}>Commander une course</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.68, fontWeight: 650 }}>Maintenant ou plus tard</p>
              </div>
            </Link>

            <Link href="/ride?service=airport" className="service-card dark">
              <Plane color="var(--gold)" />
              <div>
                <strong style={{ fontSize: 18 }}>Taxi AIBD</strong>
                <p style={{ margin: "5px 0 0", color: "#9eabba", fontSize: 12 }}>Vers ou depuis l’aéroport</p>
              </div>
            </Link>
            <Link href="/ride?service=delivery" className="service-card light">
              <Package color="var(--gold-deep)" />
              <div>
                <strong style={{ fontSize: 18 }}>Livraison</strong>
                <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 12 }}>Moto, voiture ou cargo</p>
              </div>
            </Link>

            <Link href="/restaurants" className="service-card light" style={{ minHeight: 128 }}>
              <Utensils color="var(--gold-deep)" />
              <div>
                <strong>Restaurants</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 11 }}>Menus partenaires</p>
              </div>
            </Link>
            <Link href="/ride?service=delivery&kind=express" className="service-card dark" style={{ minHeight: 128 }}>
              <Bike color="var(--gold)" />
              <div>
                <strong>Tchac Tchac</strong>
                <p style={{ margin: "4px 0 0", color: "#9eabba", fontSize: 11 }}>Colis express</p>
              </div>
            </Link>
          </div>

          <div className="card" style={{ marginTop: 14, padding: 16, display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 45, height: 45, borderRadius: 15, background: "#f7edd6", color: "var(--gold-deep)", display: "grid", placeItems: "center" }}><Clock3 /></div>
            <div>
              <strong>Planifier un trajet</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>Choisissez la date et l’heure de départ.</p>
            </div>
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
