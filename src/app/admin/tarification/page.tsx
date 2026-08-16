"use client";

import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";

const publicRules = [
  ["Véhicule réf.", "Hyundai Starex — 10 places"],
  ["Trajet 1–4 pers.", "800 FCFA / km (public)"],
  ["Trajet 5–7 pers.", "900 FCFA / km (public)"],
  ["Trajet 8–10 pers.", "1 200 FCFA / km (public)"],
  ["Aller-retour", "distance routière aller + retour"],
  ["Course ≤ 45 km", "minimum 20 000 FCFA si le km est inférieur"],
  ["MAD public Dakar", "50 000 FCFA / 10 h (frais externes exclus)"],
  ["Cérémonies / Autre", "sur devis"],
  ["Attente", "30 min offertes puis 2 500 F / 30 min (hors MAD)"],
];

const b2bRules = [
  ["MAD Dakar 10 h", "40 000 FCFA (carburant/péages/parking exclus)"],
  ["MAD hors Dakar ≤100 km", "60 000 FCFA"],
  ["MAD hors Dakar >100 km", "60 000 + 600 F/km au-delà"],
  ["Interurbain", "700 F/km · min 30 000 · AR = ×2"],
  ["Visibilité", "Espace partenaire uniquement — jamais en public"],
];

const seedKm = [
  ["Thiès", "65–69 → réf. 67"],
  ["Mbour", "84–97 → réf. 90"],
  ["Diourbel", "142–152 → réf. 147"],
  ["Louga", "188–195 → réf. 192"],
  ["Kaolack", "191–200 → réf. 195"],
  ["Saint-Louis", "224–256 → réf. 240"],
  ["Ziguinchor", "443–454 → réf. 448"],
  ["Tambacounda", "461–466 → réf. 463"],
];

export default function AdminTarificationPage() {
  return (
    <>
      <SjSectionHead eyebrow="Pricing Engine" title="Grilles SentraJet Premium" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Distance routière via API d’itinéraire (prioritaire), sinon table de secours. Arrondi au km
        supérieur.
      </p>
      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Public / grand public</h3>
          <div className="sj-list">
            {publicRules.map(([k, v]) => (
              <div key={k} className="sj-row">
                <span>{k}</span>
                <b className="sj-gold">{v}</b>
              </div>
            ))}
          </div>
        </SjCard>
        <SjCard>
          <h3>Partenaire B2B validé</h3>
          <div className="sj-list">
            {b2bRules.map(([k, v]) => (
              <div key={k} className="sj-row">
                <span>{k}</span>
                <b className="sj-gold">{v}</b>
              </div>
            ))}
          </div>
        </SjCard>
      </div>
      <SjCard style={{ marginTop: 16 }}>
        <h3>Références km depuis Dakar (secours)</h3>
        <div className="sj-list">
          {seedKm.map(([city, km]) => (
            <div key={city} className="sj-row">
              <span>{city}</span>
              <b>{km} km</b>
            </div>
          ))}
        </div>
      </SjCard>
    </>
  );
}
