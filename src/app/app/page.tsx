"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bike, CarFront, Clock3, MapPin, Package, Plane, Sparkles, Utensils } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { ServiceType } from "@/lib/types";

type CatalogService = {
  slug: ServiceType;
  title: string;
  subtitle: string;
  badge: string | null;
  sort_order: number;
};

const fallbackCatalog: CatalogService[] = [
  { slug: "ride", title: "Commander une course", subtitle: "Maintenant ou plus tard", badge: "Chauffeur en direct", sort_order: 10 },
  { slug: "airport", title: "Taxi AIBD", subtitle: "Vers ou depuis l’aéroport", badge: "Transfert premium", sort_order: 20 },
  { slug: "delivery", title: "Livraison", subtitle: "Moto, voiture ou cargo", badge: "Suivi en direct", sort_order: 30 }
];

export default function ClientHomePage() {
  const { profile } = useAuth();
  const [catalog, setCatalog] = useState<CatalogService[]>(fallbackCatalog);

  useEffect(() => {
    void supabase
      .from("service_catalog")
      .select("slug, title, subtitle, badge, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data?.length) setCatalog(data as CatalogService[]);
      });
  }, []);

  const services = useMemo(
    () => Object.fromEntries(catalog.map((service) => [service.slug, service])) as Partial<Record<ServiceType, CatalogService>>,
    [catalog]
  );
  const ride = services.ride ?? fallbackCatalog[0];
  const airport = services.airport ?? fallbackCatalog[1];
  const delivery = services.delivery ?? fallbackCatalog[2];

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "12px 18px 26px" }}>
          <p className="eyebrow">Bonjour {profile?.full_name?.split(" ")[0] || ""}</p>
          <h1 className="page-title">Que souhaitez-vous faire ?</h1>
          <p className="muted" style={{ marginTop: 9 }}>Votre chauffeur ou livreur, suivi en direct.</p>

          <Link href="/ride?service=ride" className="destination-launcher">
            <span className="destination-pin"><MapPin size={20} /></span>
            <span>
              <small>Course immédiate</small>
              <strong>Où allez-vous ?</strong>
            </span>
            <ArrowRight size={20} />
          </Link>

          <div className="service-grid">
            <Link href="/ride?service=ride" className="service-card large">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="service-icon" style={{ background: "var(--ink)", color: "var(--gold)" }}><CarFront /></span>
                <ArrowUpRight />
              </div>
              <div>
                <span className="service-kicker"><Sparkles size={12} /> {ride.badge}</span>
                <h2 style={{ margin: 0, fontSize: 25 }}>{ride.title}</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.68, fontWeight: 650 }}>{ride.subtitle}</p>
              </div>
            </Link>

            <Link href="/ride?service=airport" className="service-card dark">
              <Plane color="var(--gold)" />
              <div>
                <strong style={{ fontSize: 18 }}>{airport.title}</strong>
                <p style={{ margin: "5px 0 0", color: "#9eabba", fontSize: 12 }}>{airport.subtitle}</p>
              </div>
            </Link>
            <Link href="/ride?service=delivery" className="service-card light">
              <Package color="var(--gold-deep)" />
              <div>
                <strong style={{ fontSize: 18 }}>{delivery.title}</strong>
                <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 12 }}>{delivery.subtitle}</p>
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
