"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listBusinessRules, updateBusinessRuleValue, type BusinessRule } from "@/lib/engines/businessRules";
import { useAuth } from "@/hooks/useAuth";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const ROLE_SCOPE: Array<[string, string]> = [
  ["Direction / Admin", "Tout"],
  ["Manager / Ops / Finance / RH / Fleet", "Espace dédié + supervision"],
  ["Commercial", "CRM, prospects, demandes"],
  ["Chauffeur", "Missions affectées"],
  ["Client", "Réservations"],
  ["Prestataire B2B", "Tarifs B2B, carnet clients"],
  ["Partenaire / Financeur", "Véhicules, contrats, revenus"],
];

export default function AdminParametresPage() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === "super_admin";
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listBusinessRules("identity"), listBusinessRules("contact")])
      .then(([identity, contact]) => {
        const all = [...identity, ...contact];
        setRules(all);
        setValues(Object.fromEntries(all.map((r) => [r.id, String(r.value_json ?? "")])));
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(rule: BusinessRule) {
    if (!isSuperAdmin) return;
    setSaving(rule.id);
    setMessage(null);
    try {
      await updateBusinessRuleValue(rule.id, values[rule.id] ?? "");
      setMessage(`« ${rule.label} » mis à jour.`);
    } catch {
      setMessage("Impossible d’enregistrer cette valeur.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <BrandedLoader />;

  const identityRules = rules.filter((r) => r.category === "identity");
  const contactRules = rules.filter((r) => r.category === "contact" && r.rule_key === "whatsapp_phone");

  return (
    <>
      <SjSectionHead eyebrow="Administration" title="Configuration" />
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}
      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Identité SentraJet</h3>
          <div className="sj-form">
            {[...identityRules, ...contactRules].map((rule) => (
              <div className="sj-field" key={rule.id}>
                <label>{rule.label}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={values[rule.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [rule.id]: e.target.value }))}
                    readOnly={!isSuperAdmin}
                  />
                  {isSuperAdmin ? (
                    <button type="button" className="sj-btn" disabled={saving === rule.id} onClick={() => void save(rule)}>
                      {saving === rule.id ? "…" : "Enregistrer"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {!isSuperAdmin ? <p className="sj-muted" style={{ marginTop: 8 }}>Lecture seule — réservé au Super Admin.</p> : null}
        </SjCard>
        <SjCard>
          <h3>Accès & rôles</h3>
          <div className="sj-list">
            {ROLE_SCOPE.map(([role, scope]) => (
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
