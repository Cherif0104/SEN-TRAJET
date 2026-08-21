"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listAllVehicleContracts, type FinanceVehicleContract } from "@/lib/financeOps";
import { listPartnerContracts, bookingStatusTone, type PartnerContract } from "@/lib/platformOps";
import { formatFcfa, SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/sentrajetPricing";
import {
  listPartnerTariffOverrides,
  removePartnerTariffOverride,
  setPartnerTariffOverrideActive,
  upsertPartnerTariffOverride,
  type PartnerTariffOverride,
} from "@/lib/partnerTariffs";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const SERVICES = Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][];

function TariffOverridesPanel({ contract }: { contract: PartnerContract }) {
  const [overrides, setOverrides] = useState<PartnerTariffOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>("transfert_aibd");
  const [pricingMode, setPricingMode] = useState<"forfait" | "per_km">("forfait");
  const [basePrice, setBasePrice] = useState("");
  const [perKm, setPerKm] = useState("");
  const [minimum, setMinimum] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setOverrides(await listPartnerTariffOverrides(contract.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les tarifs personnalisés.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  function editExisting(o: PartnerTariffOverride) {
    setServiceType(o.service_type as ServiceType);
    setPricingMode(o.pricing_mode);
    setBasePrice(o.base_price_fcfa != null ? String(o.base_price_fcfa) : "");
    setPerKm(o.price_per_km_fcfa != null ? String(o.price_per_km_fcfa) : "");
    setMinimum(o.minimum_price_fcfa != null ? String(o.minimum_price_fcfa) : "");
    setNotes(o.notes ?? "");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await upsertPartnerTariffOverride({
        partnerContractId: contract.id,
        serviceType,
        pricingMode,
        basePriceFcfa: basePrice ? Number(basePrice) : null,
        pricePerKmFcfa: perKm ? Number(perKm) : null,
        minimumPriceFcfa: minimum ? Number(minimum) : null,
        notes: notes.trim() || null,
      });
      setBasePrice("");
      setPerKm("");
      setMinimum("");
      setNotes("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’enregistrer ce tarif.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--sj-line)" }}>
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      {loading ? (
        <BrandedLoader />
      ) : (
        <>
          <div className="sj-list" style={{ marginBottom: 10 }}>
            {overrides.map((o) => (
              <div key={o.id} className="sj-row">
                <div>
                  <b>{SERVICE_TYPE_LABELS[o.service_type as ServiceType] ?? o.service_type}</b>
                  <div className="sj-muted">
                    {o.pricing_mode === "forfait"
                      ? `Forfait ${formatFcfa(o.base_price_fcfa ?? 0)}`
                      : `${formatFcfa(o.price_per_km_fcfa ?? 0)}/km${o.minimum_price_fcfa ? ` · plancher ${formatFcfa(o.minimum_price_fcfa)}` : ""}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <SjBadge tone={o.is_active ? "success" : "danger"}>{o.is_active ? "Actif" : "Désactivé"}</SjBadge>
                  <button type="button" className="sj-btn sj-btn-ghost" onClick={() => editExisting(o)}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="sj-btn sj-btn-ghost"
                    onClick={() => void setPartnerTariffOverrideActive(o.id, !o.is_active).then(reload)}
                  >
                    {o.is_active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    className="sj-btn sj-btn-ghost"
                    style={{ color: "var(--color-error)" }}
                    onClick={() => {
                      if (!window.confirm("Supprimer ce tarif personnalisé ?")) return;
                      void removePartnerTariffOverride(o.id).then(reload);
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            {!overrides.length ? <p className="sj-muted">Aucun tarif personnalisé pour ce partenaire — la grille générique s’applique.</p> : null}
          </div>

          <form onSubmit={save} className="sj-form-grid">
            <div className="sj-field">
              <label>Prestation</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                {SERVICES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Mode de calcul</label>
              <select value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "forfait" | "per_km")}>
                <option value="forfait">Forfait fixe</option>
                <option value="per_km">Prix au km</option>
              </select>
            </div>
            {pricingMode === "forfait" ? (
              <div className="sj-field">
                <label>Prix forfaitaire (FCFA)</label>
                <input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="Ex. 7000" required />
              </div>
            ) : (
              <>
                <div className="sj-field">
                  <label>Prix au km (FCFA)</label>
                  <input type="number" min={0} value={perKm} onChange={(e) => setPerKm(e.target.value)} placeholder="Ex. 500" required />
                </div>
                <div className="sj-field">
                  <label>Prix plancher (FCFA, optionnel)</label>
                  <input type="number" min={0} value={minimum} onChange={(e) => setMinimum(e.target.value)} placeholder="Ex. 15000" />
                </div>
              </>
            )}
            <div className="sj-field">
              <label>Note interne (optionnel)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexte de la négociation…" />
            </div>
            <button type="submit" className="sj-btn sj-btn-primary" disabled={saving} style={{ alignSelf: "end" }}>
              {saving ? "Enregistrement…" : "Enregistrer ce tarif"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function FinanceContratsPage() {
  const [partnerContracts, setPartnerContracts] = useState<PartnerContract[]>([]);
  const [vehicleContracts, setVehicleContracts] = useState<FinanceVehicleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listPartnerContracts().catch(() => []), listAllVehicleContracts().catch(() => [])])
      .then(([pc, vc]) => {
        setPartnerContracts(pc);
        setVehicleContracts(vc);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Finance" title="Contrats" />

      <SjSectionHead title="Contrats commerciaux (prestataires)" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 12 }}>
        Cliquez sur « Tarifs personnalisés » pour fixer, pour ce partenaire précis, un prix différent de la grille
        générique sur un type de prestation donné (ex. transfert aéroport à 7 000 FCFA).
      </p>
      <div className="sj-list">
        {partnerContracts.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{c.partner_name}</b>
                <div className="sj-muted">{c.contract_number}</div>
                <div className="sj-muted">
                  {new Date(c.start_date).toLocaleDateString("fr-FR")} →{" "}
                  {c.end_date ? new Date(c.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
                <button
                  type="button"
                  className="sj-btn sj-btn-ghost"
                  style={{ display: "block", marginTop: 6 }}
                  onClick={() => setExpandedContractId((cur) => (cur === c.id ? null : c.id))}
                >
                  {expandedContractId === c.id ? "Masquer les tarifs" : "Tarifs personnalisés"}
                </button>
              </div>
            </div>
            {expandedContractId === c.id ? <TariffOverridesPanel contract={c} /> : null}
          </SjCard>
        ))}
        {!partnerContracts.length ? <SjCard><p className="sj-muted">Aucun contrat commercial.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Contrats d’exploitation (propriétaires de véhicules)" />
      <div className="sj-list">
        {vehicleContracts.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{c.vehicle_label}</b>
                <div className="sj-muted">{c.owner?.full_name || c.owner?.company_name || "Propriétaire"}</div>
                <div className="sj-muted">
                  {c.start_date ? new Date(c.start_date).toLocaleDateString("fr-FR") : "Début à définir"} →{" "}
                  {c.end_date ? new Date(c.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 8 }}>{formatFcfa(c.monthly_amount_fcfa)}/mois</div>
              </div>
            </div>
          </SjCard>
        ))}
        {!vehicleContracts.length ? <SjCard><p className="sj-muted">Aucun contrat d’exploitation.</p></SjCard> : null}
      </div>
    </>
  );
}
