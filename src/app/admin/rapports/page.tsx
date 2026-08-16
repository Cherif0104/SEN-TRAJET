"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listDrivers, listPlatformBookings, listPartnerContracts } from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function AdminRapportsPage() {
  const [stats, setStats] = useState({ ca: 0, courses: 0, panier: 0, partners: 0, drivers: 0 });

  useEffect(() => {
    void Promise.all([listPlatformBookings(), listPartnerContracts(), listDrivers()]).then(
      ([bookings, partners, drivers]) => {
        const ca = bookings.reduce((s, b) => s + Number(b.estimated_price ?? 0), 0);
        const courses = bookings.length;
        setStats({
          ca,
          courses,
          panier: courses ? Math.round(ca / courses) : 0,
          partners: partners.filter((p) => p.status === "active").length,
          drivers: drivers.length,
        });
      }
    );
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Pilotage" title="Rapports" />
      <div className="sj-grid sj-grid-4">
        {[
          ["CA estimé", formatFcfa(stats.ca)],
          ["Courses", String(stats.courses)],
          ["Panier moyen", formatFcfa(stats.panier)],
          ["Partenaires actifs", String(stats.partners)],
        ].map(([label, value]) => (
          <SjCard key={label}>
            <div className="sj-muted">{label}</div>
            <div className="sj-metric">{value}</div>
          </SjCard>
        ))}
      </div>
      <SjCard style={{ marginTop: 16 }}>
        <h3>Lecture opérationnelle</h3>
        <div className="sj-list">
          {[
            "AIBD et interurbain sont les piliers SentraJet Premium.",
            `Flotte suivie : ${stats.drivers} chauffeurs référencés.`,
            "Les partenaires B2B utilisent la grille tarifaire dédiée.",
            "Le dispatch reste le goulot d’or : affecter vite = service premium.",
          ].map((x) => (
            <div key={x} className="sj-row">
              <span>{x}</span>
              <span className="sj-gold">→</span>
            </div>
          ))}
        </div>
      </SjCard>
    </>
  );
}
