"use client";

import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";

const publicRules = [
  ["Transfert AIBD", "dès 20 000 FCFA (grille passagers)"],
  ["Course ≤ 45 km", "20 000 FCFA"],
  ["Au-delà / standard", "450 F/km ≤5 pers. · 600 F/km ≤10 pers."],
  ["Mise à disposition", "50 000 FCFA / 10 h à Dakar"],
  ["Cérémonies", "dès 45 000 FCFA"],
  ["Longue distance", "cotation (distance, durée, pax, bagages)"],
  ["Attente", "30 min offertes puis 2 500 F / 30 min (hors MAD)"],
];

const b2bRules = [
  ["AIBD 1–2", "20 000 FCFA"],
  ["AIBD 3–5", "25 000 FCFA"],
  ["AIBD 6–8", "30 000 FCFA"],
  ["AIBD 9–11", "40 000 FCFA"],
  ["AIBD + retour 1–3", "30 000 FCFA"],
  ["AIBD + retour 4–5", "cotation"],
  ["AIBD + retour 6–8", "50 000 FCFA"],
  ["Interurbain > 50 km", "700 F/km · min 30 000 · AR = ×2"],
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
