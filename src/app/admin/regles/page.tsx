"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  listBusinessRules,
  updateBusinessRuleValue,
  type BusinessRule,
} from "@/lib/engines/businessRules";
import { computeCancellationFee } from "@/lib/engines/cancellation";
import { computeWaitingFee } from "@/lib/engines/waitingFees";

export default function AdminReglesPage() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setRules(await listBusinessRules());
  }

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  const cancelPreview = computeCancellationFee(
    50000,
    new Date(Date.now() + 5 * 3600 * 1000),
    new Date(),
    rules
  );
  const waitPreview = computeWaitingFee(75, rules);

  async function save(rule: BusinessRule, raw: string) {
    setMessage(null);
    setError(null);
    try {
      let value: unknown = raw;
      if (raw.trim() === "" || raw.trim().toLowerCase() === "null") value = null;
      else if (!Number.isNaN(Number(raw)) && raw.trim() !== "") value = Number(raw);
      await updateBusinessRuleValue(rule.id, value);
      setMessage(`Règle « ${rule.label} » mise à jour.`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de mise à jour");
    }
  }

  const byCategory = rules.reduce<Record<string, BusinessRule[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <SjSectionHead
        eyebrow="Control Center"
        title="Règles métier paramétrables"
        action={
          <a className="sj-btn" href="/docs/operations/OPEN_DECISIONS.md" onClick={(e) => e.preventDefault()}>
            Décisions ouvertes
          </a>
        }
      />
      <p className="sj-muted">
        Aucune règle importante ne doit rester codée en dur. Modifiez ici tarifs seuils, pourcentages,
        délais et frais. Les décisions ouvertes (ex. annulation 2h–4h) restent à <code>null</code>.
      </p>

      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}

      <div className="sj-grid sj-grid-2" style={{ marginTop: 16 }}>
        <SjCard>
          <h3>Aperçu annulation (50 000 F, ~5h avant)</h3>
          <div className="sj-metric">{cancelPreview.feeFcfa.toLocaleString("fr-FR")} F</div>
          <div className="sj-metric-sub">
            Bande {cancelPreview.band} — {cancelPreview.note}
            {cancelPreview.decisionPending ? " ⚠ décision pending" : ""}
          </div>
        </SjCard>
        <SjCard>
          <h3>Aperçu attente (75 min)</h3>
          <div className="sj-metric">{waitPreview.feeFcfa.toLocaleString("fr-FR")} F</div>
          <div className="sj-metric-sub">
            {waitPreview.blocks} tranche(s) après {waitPreview.freeMinutes} min gratuites
          </div>
        </SjCard>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <SjSectionHead title={category} />
          <SjCard>
            <div className="sj-list">
              {items.map((rule) => (
                <div key={rule.id} className="sj-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <b>{rule.label}</b>
                    <div className="sj-muted">
                      {rule.rule_key}
                      {rule.unit ? ` · ${rule.unit}` : ""}
                      {rule.notes ? ` · ${rule.notes}` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input
                        defaultValue={
                          rule.value_json === null || rule.value_json === "null"
                            ? "null"
                            : String(rule.value_json).replace(/^"|"$/g, "")
                        }
                        id={`rule-${rule.id}`}
                        style={{
                          flex: 1,
                          background: "#091626",
                          border: "1px solid #26384f",
                          color: "#fff",
                          padding: "10px 12px",
                          borderRadius: 11,
                        }}
                      />
                      <button
                        type="button"
                        className="sj-btn sj-btn-primary"
                        onClick={() => {
                          const el = document.getElementById(`rule-${rule.id}`) as HTMLInputElement | null;
                          if (el) void save(rule, el.value);
                        }}
                        disabled={rule.id.startsWith("fallback-")}
                      >
                        Sauver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SjCard>
        </div>
      ))}
    </>
  );
}
