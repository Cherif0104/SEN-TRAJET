"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  createLead,
  listLeads,
  updateLeadStatus,
  type Lead,
  type LeadStatus,
} from "@/lib/crmOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function leadTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "converti") return "success";
  if (status === "perdu") return "danger";
  if (status === "qualifie") return "warning";
  return "info";
}

export default function CommercialProspectsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", source: "commercial", notes: "" });

  useEffect(() => {
    void listLeads()
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError("Indiquez au moins un nom.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createLead(form);
      setLeads((prev) => [created, ...prev]);
      setForm({ fullName: "", phone: "", email: "", source: "commercial", notes: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer ce prospect.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await updateLeadStatus(lead.id, status);
    } catch {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l)));
    }
  }

  return (
    <>
      <SjSectionHead
        title="Prospects"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm((v) => !v)}>
            + Ajouter un prospect
          </button>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Prospects génériques (particuliers ou professionnels). Pour un prestataire B2B avec grille
        tarifaire, utilisez le{" "}
        <Link href="/admin/partenaires" className="sj-gold">funnel partenaire dédié</Link>.
      </p>

      {showForm ? (
        <SjCard style={{ marginBottom: 16 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              <div className="sj-field">
                <label>Nom complet *</label>
                <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div className="sj-field">
                <label>Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="sj-field">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="sj-field">
                <label>Source</label>
                <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
                  <option value="commercial">Prospection commerciale</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="site_web">Site web</option>
                  <option value="recommandation">Recommandation</option>
                  <option value="salon">Salon / événement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <div className="sj-field">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
            <button type="submit" className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Créer ce prospect"}
            </button>
          </form>
        </SjCard>
      ) : null}

      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {leads.map((l) => (
            <SjCard key={l.id}>
              <div className="sj-between">
                <div>
                  <b>{l.full_name || "Prospect"}</b>
                  <div className="sj-muted">{l.phone || "—"} · {l.email || "—"} · {l.source || "—"}</div>
                  {l.notes ? <div className="sj-muted" style={{ marginTop: 4 }}>{l.notes}</div> : null}
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={leadTone(l.status)}>{LEAD_STATUS_LABELS[l.status] ?? l.status}</SjBadge>
                  <select
                    value={l.status}
                    onChange={(e) => void changeStatus(l, e.target.value as LeadStatus)}
                    style={{ marginTop: 8, display: "block" }}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SjCard>
          ))}
          {!leads.length ? <SjCard><p className="sj-muted">Aucun prospect pour le moment.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
