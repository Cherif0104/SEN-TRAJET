"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";
import { bookingStatusTone } from "@/lib/platformOps";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";

type OwnerRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  company_name: string | null;
  partner_kind: string;
  address: string | null;
  notes: string | null;
  committed_amount_fcfa: number | null;
};

type ContractRow = {
  id: string;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  status: string;
  owner_id: string;
};

const emptyForm = {
  full_name: "",
  company_name: "",
  phone: "",
  email: "",
  status: "active",
  partner_kind: "asset_owner",
  address: "",
  notes: "",
  committed_amount_fcfa: "",
};

const kindLabels: Record<string, string> = {
  asset_owner: "Propriétaire d’actif",
  bank: "Banque / financeur",
  lessor: "Bailleur",
  hire_purchase: "Location-vente",
  shareholder: "Actionnaire",
  investor: "Investisseur",
  other: "Autre",
};

export default function AdminProprietairesPage() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [minMonthly, setMinMonthly] = useState(500000);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ownersResult, contractsResult, rules] = await Promise.all([
      supabase
        .from("vehicle_owners")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicle_exploitation_contracts")
        .select("id, vehicle_label, monthly_amount_fcfa, status, owner_id"),
      listBusinessRules("vehicle_partner"),
    ]);
    if (ownersResult.error) throw new Error(ownersResult.error.message);
    if (contractsResult.error) throw new Error(contractsResult.error.message);
    setOwners((ownersResult.data ?? []) as OwnerRow[]);
    setContracts((contractsResult.data ?? []) as ContractRow[]);
    setMinMonthly(
      ruleNumber(rules, "vehicle_partner", "min_monthly_fcfa", 500000),
    );
  }, []);

  useEffect(() => {
    void load().catch((failure) =>
      setError(failure instanceof Error ? failure.message : "Chargement impossible."),
    );
  }, [load]);

  const edit = (owner: OwnerRow) => {
    setEditing(owner.id);
    setForm({
      full_name: owner.full_name,
      company_name: owner.company_name ?? "",
      phone: owner.phone ?? "",
      email: owner.email ?? "",
      status: owner.status,
      partner_kind: owner.partner_kind,
      address: owner.address ?? "",
      notes: owner.notes ?? "",
      committed_amount_fcfa: owner.committed_amount_fcfa
        ? String(owner.committed_amount_fcfa)
        : "",
    });
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      full_name: form.full_name,
      company_name: form.company_name || null,
      phone: form.phone || null,
      email: form.email || null,
      status: form.status,
      partner_kind: form.partner_kind,
      relation_subtype: form.partner_kind,
      address: form.address || null,
      notes: form.notes || null,
      committed_amount_fcfa: form.committed_amount_fcfa
        ? Number(form.committed_amount_fcfa)
        : null,
    };
    try {
      const result = editing
        ? await supabase.from("vehicle_owners").update(payload).eq("id", editing)
        : await supabase.from("vehicle_owners").insert(payload);
      if (result.error) throw new Error(result.error.message);
      setEditing(null);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SjSectionHead
        eyebrow="Capital & actifs"
        title="Partenaires financiers, propriétaires et investisseurs"
        action={
          <button
            className="sj-btn sj-btn-primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setShowForm((value) => !value);
            }}
          >
            {showForm ? "Fermer" : "+ Nouveau partenaire"}
          </button>
        }
      />
      <SjCard style={{ marginBottom: 16 }}>
        <div className="sj-muted">Condition d’entrée paramétrable pour les actifs</div>
        <div className="sj-metric">
          À partir de {minMonthly.toLocaleString("fr-FR")} FCFA/mois
        </div>
        <div className="sj-metric-sub">
          Banques, propriétaires, bailleurs, location-vente et actionnaires — distincts des prestataires commerciaux.
        </div>
      </SjCard>

      {showForm ? (
        <SjCard style={{ marginBottom: 20 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              <div className="sj-field">
                <label>Nom du contact *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="sj-field">
                <label>Organisation</label>
                <input
                  value={form.company_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      company_name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="sj-field">
                <label>Nature du partenariat</label>
                <select
                  value={form.partner_kind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      partner_kind: event.target.value,
                    }))
                  }
                >
                  {Object.entries(kindLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sj-field">
                <label>Statut</label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="active">Actif</option>
                  <option value="prospect">Prospect</option>
                  <option value="inactive">Inactif</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
              <div className="sj-field">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
              <div className="sj-field">
                <label>E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="sj-field">
                <label>Adresse</label>
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </div>
              <div className="sj-field">
                <label>Engagement total FCFA</label>
                <input
                  type="number"
                  min="0"
                  value={form.committed_amount_fcfa}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      committed_amount_fcfa: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="sj-field">
              <label>Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
            {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
            <button className="sj-btn sj-btn-primary" disabled={saving}>
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le partenaire"}
            </button>
          </form>
        </SjCard>
      ) : null}

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Partenaires capital & actifs</h3>
          <div className="sj-list">
            {owners.map((owner) => (
              <div key={owner.id} className="sj-row items-start">
                <div>
                  <b>{owner.company_name || owner.full_name}</b>
                  <div className="sj-muted">
                    {kindLabels[owner.partner_kind] || owner.partner_kind} ·{" "}
                    {owner.phone || owner.email || "—"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      className="sj-btn sj-btn-primary"
                      href={`/admin/proprietaires/${owner.id}`}
                    >
                      Vue 360
                    </Link>
                    <button
                      className="sj-btn"
                      type="button"
                      onClick={() => edit(owner)}
                    >
                      Modifier
                    </button>
                    {!owner.user_id && owner.email ? (
                      <Link
                        className="sj-btn"
                        href={`/admin/utilisateurs?role=asset_partner&resourceType=asset_partner&resourceId=${owner.id}&name=${encodeURIComponent(owner.full_name)}&email=${encodeURIComponent(owner.email)}`}
                      >
                        Créer le compte
                      </Link>
                    ) : null}
                  </div>
                </div>
                <SjBadge tone={bookingStatusTone(owner.status)}>
                  {owner.status}
                </SjBadge>
              </div>
            ))}
            {!owners.length ? (
              <div className="sj-muted">Aucun partenaire enregistré.</div>
            ) : null}
          </div>
        </SjCard>
        <SjCard>
          <h3>Contrats d’exploitation</h3>
          <div className="sj-list">
            {contracts.map((contract) => (
              <div key={contract.id} className="sj-row">
                <div>
                  <b>{contract.vehicle_label}</b>
                  <div className="sj-muted">
                    {Number(contract.monthly_amount_fcfa).toLocaleString("fr-FR")} F/mois
                  </div>
                </div>
                <SjBadge tone={bookingStatusTone(contract.status)}>
                  {contract.status}
                </SjBadge>
              </div>
            ))}
            {!contracts.length ? <div className="sj-muted">Aucun contrat.</div> : null}
          </div>
        </SjCard>
      </div>
    </>
  );
}
