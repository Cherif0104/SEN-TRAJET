"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";

export default function ProprietaireHomePage() {
  const [minMonthly, setMinMonthly] = useState(500000);

  useEffect(() => {
    void listBusinessRules("vehicle_partner").then((rules) => {
      setMinMonthly(ruleNumber(rules, "vehicle_partner", "min_monthly_fcfa", 500000));
    });
  }, []);

  return (
    <>
      <div className="sj-hero">
        <section className="sj-hero-card">
          <div className="sj-hero-art" />
          <div className="sj-hero-copy">
            <div className="sj-eyebrow">SentraJet Vehicle Partner</div>
            <h1>Votre véhicule travaille. Nous nous occupons du reste.</h1>
            <p>
              Confiez l’exploitation de votre véhicule premium à SentraJet dans le cadre d’un contrat
              d’exploitation. Condition d’entrée à partir de{" "}
              <strong>{minMonthly.toLocaleString("fr-FR")} FCFA/mois</strong> selon le véhicule et les
              modalités contractuelles — ce n’est pas un rendement garanti.
            </p>
            <a className="sj-btn sj-btn-primary" href="https://wa.me/221788324069" target="_blank" rel="noreferrer">
              Contacter SentraJet — Propriétaires
            </a>
          </div>
        </section>
        <section className="sj-hero-stats">
          <div className="sj-stat">
            <div className="sj-muted">À partir de</div>
            <div className="num">{Math.round(minMonthly / 1000)}k</div>
            <div className="sj-gold">FCFA / mois</div>
          </div>
          <div className="sj-stat">
            <div className="sj-muted">Exemple</div>
            <div className="num">Starex</div>
            <div className="sj-gold">Contrat d’exploitation</div>
          </div>
        </section>
      </div>

      <SjSectionHead title="Ce que SentraJet peut prendre en charge" />
      <div className="sj-grid sj-grid-3">
        {[
          "Exploitation commerciale",
          "Recherche & gestion des missions",
          "Gestion des chauffeurs",
          "Planification",
          "Entretien (selon contrat)",
          "Relation client & reporting",
        ].map((x) => (
          <SjCard key={x}>
            <b>{x}</b>
          </SjCard>
        ))}
      </div>
      <SjCard style={{ marginTop: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Assurance, carburant, réparations lourdes, pneus, taxes, immobilisation et responsabilité
          sont précisés dans le contrat propriétaire — décisions ouvertes D-06.
        </p>
      </SjCard>
    </>
  );
}
