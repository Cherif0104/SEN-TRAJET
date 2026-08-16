"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
  type PlatformClient,
} from "@/lib/platformOps";

const emptyForm = {
  full_name: "",
  company_name: "",
  phone: "",
  email: "",
  client_type: "particulier",
  notes: "",
};

export default function AdminClientsPage() {
  const [rows, setRows] = useState<PlatformClient[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listClients().then(setRows).catch(() => setRows([]));
  }, []);

  const edit = (client: PlatformClient) => {
    setEditing(client.id);
    setForm({
      full_name: client.full_name ?? "",
      company_name: client.company_name ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      client_type: client.client_type,
      notes: client.notes ?? "",
    });
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const existing = editing ? rows.find((row) => row.id === editing) : null;
      const input = {
        full_name: form.full_name || null,
        company_name: form.company_name || null,
        phone: form.phone || null,
        email: form.email || null,
        client_type: form.client_type,
        notes: form.notes || null,
        avatar_url: existing?.avatar_url ?? null,
      };
      const saved = editing ? await updateClient(editing, input) : await createClient(input);
      setRows((current) =>
        editing
          ? current.map((row) => (row.id === saved.id ? saved : row))
          : [saved, ...current],
      );
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SjSectionHead
        eyebrow="CRM"
        title="Clients"
        action={
          <button className="sj-btn sj-btn-primary" type="button" onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setShowForm((value) => !value);
          }}>
            {showForm ? "Fermer" : "+ Nouveau client"}
          </button>
        }
      />
      {showForm ? (
        <SjCard style={{ marginBottom: 20 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              {([
                ["full_name", "Nom complet", "text"],
                ["company_name", "Entreprise", "text"],
                ["phone", "Téléphone", "tel"],
                ["email", "E-mail", "email"],
              ] as const).map(([key, label, type]) => (
                <div className="sj-field" key={key}>
                  <label>{label}</label>
                  <input type={type} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </div>
              ))}
              <div className="sj-field">
                <label>Type de client</label>
                <select value={form.client_type} onChange={(event) => setForm((current) => ({ ...current, client_type: event.target.value }))}>
                  <option value="particulier">Particulier</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </div>
            </div>
            <div className="sj-field">
              <label>Notes</label>
              <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
            <button className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer le client"}
            </button>
          </form>
        </SjCard>
      ) : null}
      <div className="sj-grid sj-grid-3">
        {rows.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div className="sj-avatar">{(c.company_name || c.full_name || "?").slice(0, 1)}</div>
              <span className="sj-muted">{c.client_type}</span>
            </div>
            <h3 style={{ marginTop: 14 }}>{c.company_name || c.full_name || "Client"}</h3>
            <div className="sj-muted">{c.phone || c.email || "—"}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="sj-btn" type="button" onClick={() => edit(c)}>Modifier</button>
              {!c.user_id && c.email ? (
                <Link className="sj-btn" href={`/admin/utilisateurs?role=client&resourceType=client&resourceId=${c.id}&name=${encodeURIComponent(c.full_name || c.company_name || "")}&email=${encodeURIComponent(c.email)}`}>
                  Créer le compte
                </Link>
              ) : null}
              <button
                className="sj-btn text-[var(--color-error)]"
                type="button"
                onClick={() => {
                  if (!window.confirm("Supprimer ce client ?")) return;
                  void deleteClient(c.id).then(() => setRows((current) => current.filter((row) => row.id !== c.id))).catch((failure) => setError(failure.message));
                }}
              >
                Supprimer
              </button>
            </div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? <SjCard><p className="sj-muted">Aucun client enregistré.</p></SjCard> : null}
    </>
  );
}
