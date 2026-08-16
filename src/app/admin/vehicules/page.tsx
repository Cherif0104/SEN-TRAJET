"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  bookingStatusTone,
  createVehicle,
  deleteManagedVehicle,
  listDrivers,
  listVehicles,
  updateManagedVehicle,
  type PlatformDriver,
  type PlatformVehicle,
} from "@/lib/platformOps";
import { uploadManagedResourceImage } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";

const emptyForm = {
  brand: "",
  model: "",
  plate_number: "",
  category: "berline",
  seats: "4",
  status: "available",
  driver_id: "",
  year: "",
  color: "",
  notes: "",
  is_verified: false,
};

export default function AdminVehiculesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformVehicle[]>([]);
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listVehicles(), listDrivers()])
      .then(([vehicles, driverRows]) => {
        setRows(vehicles);
        setDrivers(driverRows);
      })
      .catch(() => setRows([]));
  }, []);

  const edit = (vehicle: PlatformVehicle) => {
    setEditing(vehicle.id);
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      plate_number: vehicle.plate_number,
      category: vehicle.category,
      seats: String(vehicle.seats ?? 4),
      status: vehicle.status,
      driver_id: vehicle.driver_id ?? "",
      year: vehicle.year ? String(vehicle.year) : "",
      color: vehicle.color ?? "",
      notes: vehicle.notes ?? "",
      is_verified: vehicle.is_verified,
    });
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const previous = editing ? rows.find((row) => row.id === editing) : null;
      const input = {
        brand: form.brand,
        model: form.model,
        plate_number: form.plate_number,
        category: form.category,
        seats: Number(form.seats) || null,
        status: form.status,
        driver_id: form.driver_id || null,
        year: form.year ? Number(form.year) : null,
        color: form.color || null,
        notes: form.notes || null,
        photo_url: previous?.photo_url ?? null,
        photo_urls: previous?.photo_urls ?? [],
        is_verified: form.is_verified,
      };
      let saved = editing
        ? await updateManagedVehicle(editing, input)
        : await createVehicle(input);
      if (photo && user) {
        const photoUrl = await uploadManagedResourceImage(user.id, "vehicles", saved.id, photo);
        saved = await updateManagedVehicle(saved.id, {
          photo_url: photoUrl,
          photo_urls: [...(saved.photo_urls ?? []), photoUrl],
        });
      }
      setRows((current) =>
        editing
          ? current.map((row) => (row.id === saved.id ? saved : row))
          : [saved, ...current],
      );
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);
      setPhoto(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SjSectionHead
        eyebrow="Assets"
        title="Flotte"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setShowForm((value) => !value);
          }}>
            {showForm ? "Fermer" : "+ Nouveau véhicule"}
          </button>
        }
      />
      {showForm ? (
        <SjCard style={{ marginBottom: 20 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              {([
                ["brand", "Marque *", "text"],
                ["model", "Modèle *", "text"],
                ["plate_number", "Immatriculation *", "text"],
                ["category", "Catégorie *", "text"],
                ["seats", "Nombre de places", "number"],
                ["year", "Année", "number"],
                ["color", "Couleur", "text"],
              ] as const).map(([key, label, type]) => (
                <div className="sj-field" key={key}>
                  <label>{label}</label>
                  <input
                    type={type}
                    min={type === "number" ? 1 : undefined}
                    value={form[key]}
                    required={label.includes("*")}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="sj-field">
                <label>Chauffeur affecté</label>
                <select value={form.driver_id} onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))}>
                  <option value="">Non affecté</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}
                </select>
              </div>
              <div className="sj-field">
                <label>Statut</label>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="available">Disponible</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
              <div className="sj-field">
                <label>Photo du véhicule</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.is_verified} onChange={(event) => setForm((current) => ({ ...current, is_verified: event.target.checked }))} />
                Véhicule vérifié
              </label>
            </div>
            <div className="sj-field">
              <label>Notes</label>
              <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
            <button className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter à la flotte"}
            </button>
          </form>
        </SjCard>
      ) : null}
      <div className="sj-grid sj-grid-3">
        {rows.map((v) => (
          <SjCard key={v.id}>
            {v.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.photo_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
            ) : null}
            <div className="sj-between">
              <h3>
                {v.brand} {v.model}
              </h3>
              <SjBadge tone={bookingStatusTone(v.status)}>{v.status}</SjBadge>
            </div>
            <div className="sj-muted">
              {v.seats ?? "?"} places · {v.category}
            </div>
            <div className="sj-section-head" style={{ margin: "18px 0 0" }}>
              <span className="sj-muted">Immatriculation</span>
              <b>{v.plate_number}</b>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="sj-btn sj-btn-primary" href={`/admin/vehicules/${v.id}`}>
                Dossier 360
              </Link>
              <button className="sj-btn" type="button" onClick={() => edit(v)}>Modifier</button>
              <button
                className="sj-btn text-[var(--color-error)]"
                type="button"
                onClick={() => {
                  if (!window.confirm("Supprimer ce véhicule ?")) return;
                  void deleteManagedVehicle(v.id).then(() => setRows((current) => current.filter((row) => row.id !== v.id))).catch((failure) => setError(failure.message));
                }}
              >
                Supprimer
              </button>
            </div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? <SjCard><p className="sj-muted">Aucun véhicule.</p></SjCard> : null}
    </>
  );
}
