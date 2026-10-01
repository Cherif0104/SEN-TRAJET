"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  createPremiumRoute,
  deletePremiumRoute,
  listManagedPremiumRoutes,
  updatePremiumRoute,
  type PremiumRegionalRoute,
} from "@/lib/premiumRoutes";

const emptyForm = {
  destination_city: "",
  region: "",
  distance_km: "",
  duration_minutes: "",
  suggested_schedule: "",
  description: "",
  display_order: "0",
};

export default function AdminDestinationsPage() {
  const [rows, setRows] = useState<PremiumRegionalRoute[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listManagedPremiumRoutes()
      .then(setRows)
      .catch((failure) => setError(failure instanceof Error ? failure.message : "Chargement impossible."));
  }, []);

  const edit = (route: PremiumRegionalRoute) => {
    setEditing(route.id);
    setForm({
      destination_city: route.destination_city,
      region: route.region ?? "",
      distance_km: String(route.distance_km),
      duration_minutes: route.duration_minutes != null ? String(route.duration_minutes) : "",
      suggested_schedule: route.suggested_schedule ?? "",
      description: route.description ?? "",
      display_order: String(route.display_order),
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
        destination_city: form.destination_city.trim(),
        region: form.region.trim() || null,
        distance_km: Number(form.distance_km) || 1,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        suggested_schedule: form.suggested_schedule.trim() || null,
        description: form.description.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: existing?.is_active ?? true,
      };
      const saved = editing
        ? await updatePremiumRoute(editing, input)
        : await createPremiumRoute(input);
      setRows((current) =>
        editing
          ? current.map((row) => (row.id === saved.id ? saved : row))
          : [...current, saved].sort((a, b) => a.display_order - b.display_order)
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
        eyebrow="Catalogue vitrine"
        title="Destinations régionales"
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
            {showForm ? "Fermer" : "+ Nouvelle destination"}
          </button>
        }
      />
      <SjCard style={{ marginBottom: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Alimente la page publique <code>/destinations</code>. Le prix affiché n’est jamais figé
          ici : il est recalculé en direct à partir de la distance via le moteur de tarification
          interurbain — modifiez uniquement la distance et les informations de présentation.
        </p>
      </SjCard>

      {error ? <p className="rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

      {showForm ? (
        <SjCard style={{ marginBottom: 20 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              <div className="sj-field">
                <label>Ville de destination *</label>
                <input
                  value={form.destination_city}
                  onChange={(e) => setForm((current) => ({ ...current, destination_city: e.target.value }))}
                  placeholder="Ex. Saint-Louis"
                  required
                />
              </div>
              <div className="sj-field">
                <label>Région (regroupement affichage)</label>
                <input
                  value={form.region}
                  onChange={(e) => setForm((current) => ({ ...current, region: e.target.value }))}
                  placeholder="Ex. Nord"
                />
              </div>
              <div className="sj-field">
                <label>Distance depuis Dakar (km) *</label>
                <input
                  type="number"
                  min={1}
                  value={form.distance_km}
                  onChange={(e) => setForm((current) => ({ ...current, distance_km: e.target.value }))}
                  required
                />
              </div>
              <div className="sj-field">
                <label>Durée indicative (minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={form.duration_minutes}
                  onChange={(e) => setForm((current) => ({ ...current, duration_minutes: e.target.value }))}
                />
              </div>
              <div className="sj-field">
                <label>Fréquence / disponibilité</label>
                <input
                  value={form.suggested_schedule}
                  onChange={(e) => setForm((current) => ({ ...current, suggested_schedule: e.target.value }))}
                  placeholder="Ex. Départs à la demande, 7j/7"
                />
              </div>
              <div className="sj-field">
                <label>Ordre d’affichage</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((current) => ({ ...current, display_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="sj-field">
              <label>Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              />
            </div>
            {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
            <button className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter la destination"}
            </button>
          </form>
        </SjCard>
      ) : null}

      <div className="sj-grid sj-grid-3">
        {rows.map((route) => (
          <SjCard key={route.id}>
            <div className="sj-between">
              <h3 style={{ margin: 0 }}>Dakar → {route.destination_city}</h3>
              <SjBadge tone={route.is_active ? "success" : "danger"}>
                {route.is_active ? "Publié" : "Masqué"}
              </SjBadge>
            </div>
            <div className="sj-muted" style={{ marginTop: 6 }}>
              {route.region || "Sans région"} · {route.distance_km} km
              {route.duration_minutes ? ` · ~${route.duration_minutes} min` : ""}
            </div>
            {route.suggested_schedule ? <div className="sj-muted">{route.suggested_schedule}</div> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="sj-btn" type="button" onClick={() => edit(route)}>
                Modifier
              </button>
              <button
                className="sj-btn"
                type="button"
                onClick={() => {
                  setError(null);
                  void updatePremiumRoute(route.id, { is_active: !route.is_active })
                    .then((saved) => setRows((current) => current.map((row) => (row.id === route.id ? saved : row))))
                    .catch((failure) => setError(failure instanceof Error ? failure.message : "Impossible de modifier cette destination."));
                }}
              >
                {route.is_active ? "Masquer" : "Publier"}
              </button>
              <button
                className="sj-btn text-[var(--color-error)]"
                type="button"
                onClick={() => {
                  if (!window.confirm("Supprimer définitivement cette destination ?")) return;
                  setError(null);
                  void deletePremiumRoute(route.id)
                    .then(() => setRows((current) => current.filter((row) => row.id !== route.id)))
                    .catch((failure) => setError(failure instanceof Error ? failure.message : "Impossible de supprimer."));
                }}
              >
                Supprimer
              </button>
            </div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? (
        <SjCard>
          <p className="sj-muted">Aucune destination enregistrée.</p>
        </SjCard>
      ) : null}
    </>
  );
}
