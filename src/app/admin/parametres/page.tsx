"use client";

import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";

export default function AdminParametresPage() {
  return (
    <>
      <SjSectionHead eyebrow="Administration" title="Paramètres" />
      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Identité SentraJet</h3>
          <div className="sj-form">
            <div className="sj-field">
              <label>Nom</label>
              <input defaultValue="SentraJet Premium" readOnly />
            </div>
            <div className="sj-field">
              <label>Contact WhatsApp</label>
              <input defaultValue="+221 78 832 40 69" readOnly />
            </div>
            <div className="sj-field">
              <label>Zone principale</label>
              <input defaultValue="Dakar & Sénégal" readOnly />
            </div>
          </div>
        </SjCard>
        <SjCard>
          <h3>Accès & rôles</h3>
          <div className="sj-list">
            {[
              ["Direction / Admin", "Tout"],
              ["Chauffeur", "Missions"],
              ["Client", "Réservations"],
              ["Partenaire B2B", "Tarifs B2B"],
            ].map(([role, scope]) => (
              <div key={role} className="sj-row">
                <span>{role}</span>
                <span className="sj-badge info">{scope}</span>
              </div>
            ))}
          </div>
        </SjCard>
      </div>
    </>
  );
}
