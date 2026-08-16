"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listPartnerContracts } from "@/lib/platformOps";

export default function PartenaireProfilPage() {
  const { user, profile } = useAuth();
  const [company, setCompany] = useState("");

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const contracts = await listPartnerContracts().catch(() => []);
      const mine = contracts.find((c) => c.partner_user_id === user.id);
      setCompany(mine?.partner_name || profile?.full_name || "");
    })();
  }, [user, profile]);

  return (
    <>
      <SjSectionHead title="Mon compte partenaire" />
      <SjCard>
        <div className="sj-form-grid">
          <div className="sj-field">
            <label>Nom commercial</label>
            <input value={company} readOnly />
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
            <label>Rôle</label>
            <input value="Partenaire B2B" disabled />
          </div>
        </div>
      </SjCard>
    </>
  );
}
