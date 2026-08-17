"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listPartnerContracts } from "@/lib/platformOps";
import { createPartnerClient, listPartnerClients, type PartnerClient } from "@/lib/partnerClients";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function PartenaireClientsPage() {
  const { user } = useAuth();
  const [contractId, setContractId] = useState<string | null>(null);
  const [clients, setClients] = useState<PartnerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", companyName: "", phone: "", email: "" });

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const contracts = await listPartnerContracts().catch(() => []);
        const mine = contracts.find((c) => c.partner_user_id === user.id);
        setContractId(mine?.id ?? null);
        if (mine) {
          const rows = await listPartnerClients(mine.id).catch(() => []);
          setClients(rows);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.full_name, c.company_name, c.phone, c.email].some((v) => v?.toLowerCase().includes(q))
    );
  }, [clients, query]);

  async function submitNewClient(e: React.FormEvent) {
    e.preventDefault();
    if (!contractId) {
      setError("Aucun contrat partenaire actif — impossible de créer un client.");
      return;
    }
    if (!form.fullName.trim() && !form.companyName.trim()) {
      setError("Indiquez au moins un nom ou une raison sociale.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createPartnerClient({
        contractId,
        fullName: form.fullName.trim() || null,
        companyName: form.companyName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        clientType: form.companyName.trim() ? "entreprise" : "particulier",
      });
      setClients((prev) => [created, ...prev]);
      setForm({ fullName: "", companyName: "", phone: "", email: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer ce client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SjSectionHead
        title="Clients"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm((v) => !v)}>
            + Nouveau client
          </button>
        }
      />

      {!contractId ? (
        <SjCard style={{ marginBottom: 16, borderColor: "var(--color-warning)" }}>
          <p className="sj-muted" style={{ margin: 0 }}>
            Un contrat partenaire actif est requis pour constituer votre carnet clients. Contactez SentraJet.
          </p>
        </SjCard>
      ) : null}

      {showForm ? (
        <SjCard style={{ marginBottom: 16 }}>
          <form className="sj-form" onSubmit={submitNewClient}>
            <div className="sj-form-grid">
              <div className="sj-field">
                <label>Nom complet</label>
                <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="sj-field">
                <label>Raison sociale (optionnel)</label>
                <input
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
              <div className="sj-field">
                <label>Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="sj-field">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
            <button type="submit" className="sj-btn sj-btn-primary" disabled={saving || !contractId}>
              {saving ? "Enregistrement…" : "Ajouter ce client"}
            </button>
          </form>
        </SjCard>
      ) : null}

      <div className="sj-field" style={{ marginBottom: 16 }}>
        <input
          placeholder="Rechercher un client (nom, société, téléphone, email)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((c) => (
            <Link key={c.id} href={`/partenaire/clients/${c.id}`}>
              <SjCard>
                <div className="sj-between">
                  <div>
                    <b>{c.full_name || c.company_name || "Client"}</b>
                    <div className="sj-muted">{c.company_name && c.full_name ? c.company_name : c.phone || c.email || "—"}</div>
                  </div>
                  <span className="sj-badge info">{c.client_type === "entreprise" ? "Entreprise" : "Particulier"}</span>
                </div>
              </SjCard>
            </Link>
          ))}
          {!filtered.length ? (
            <SjCard>
              <p className="sj-muted">
                {clients.length ? "Aucun client ne correspond à cette recherche." : "Aucun client pour le moment. Ajoutez votre premier client."}
              </p>
            </SjCard>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
