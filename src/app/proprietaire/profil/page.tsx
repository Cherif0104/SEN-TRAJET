"use client";

import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";

export default function ProprietaireProfilPage() {
  const { user, profile } = useAuth();
  return (
    <>
      <SjSectionHead title="Mon profil propriétaire" />
      <SjCard>
        <div className="sj-form-grid">
          <div className="sj-field">
            <label>Nom</label>
            <input value={profile?.full_name || ""} readOnly />
          </div>
          <div className="sj-field">
            <label>Téléphone</label>
            <input value={profile?.phone || ""} readOnly />
          </div>
          <div className="sj-field">
            <label>E-mail</label>
            <input value={user?.email || ""} readOnly />
          </div>
          <div className="sj-field">
            <label>Espace</label>
            <input value="Propriétaire / Vehicle Partner" disabled />
          </div>
        </div>
      </SjCard>
    </>
  );
}
