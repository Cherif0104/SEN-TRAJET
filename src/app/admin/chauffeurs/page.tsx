"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  bookingStatusTone,
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
  type PlatformDriver,
} from "@/lib/platformOps";
import {
  getDriverDocumentUrl,
  uploadManagedDriverDocument,
  uploadManagedResourceImage,
} from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  status: "active",
  license_number: "",
  license_expiry_date: "",
  address: "",
  emergency_contact: "",
  notes: "",
};

export default function AdminChauffeursPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformDriver[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listDrivers().then(setRows).catch(() => setRows([]));
  }, []);

  const edit = (driver: PlatformDriver) => {
    setEditing(driver.id);
    setForm({
      full_name: driver.full_name,
      phone: driver.phone ?? "",
      email: driver.email ?? "",
      status: driver.status,
      license_number: driver.license_number ?? "",
      license_expiry_date: driver.license_expiry_date ?? "",
      address: driver.address ?? "",
      emergency_contact: driver.emergency_contact ?? "",
      notes: driver.notes ?? "",
    });
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = {
        ...form,
        phone: form.phone || null,
        email: form.email || null,
        license_number: form.license_number || null,
        license_expiry_date: form.license_expiry_date || null,
        address: form.address || null,
        emergency_contact: form.emergency_contact || null,
        notes: form.notes || null,
        photo_url: editing ? rows.find((row) => row.id === editing)?.photo_url ?? null : null,
        license_photo_url: editing
          ? rows.find((row) => row.id === editing)?.license_photo_url ?? null
          : null,
      };
      let saved = editing ? await updateDriver(editing, input) : await createDriver(input);
      const updates: { photo_url?: string; license_photo_url?: string } = {};
      if (user && photo) {
        updates.photo_url = await uploadManagedResourceImage(user.id, "drivers", saved.id, photo);
      }
      if (user && licensePhoto) {
        updates.license_photo_url = await uploadManagedDriverDocument(
          user.id,
          saved.id,
          licensePhoto,
        );
      }
      if (Object.keys(updates).length) saved = await updateDriver(saved.id, updates);
      setRows((current) =>
        editing
          ? current.map((row) => (row.id === saved.id ? saved : row))
          : [saved, ...current],
      );
      setEditing(null);
      setShowForm(false);
      setForm(emptyForm);
      setPhoto(null);
      setLicensePhoto(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SjSectionHead
        eyebrow="Ressources"
        title="Chauffeurs"
        action={
          <button className="sj-btn sj-btn-primary" type="button" onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setShowForm((value) => !value);
          }}>
            {showForm ? "Fermer" : "+ Nouveau chauffeur"}
          </button>
        }
      />
      {showForm ? (
        <SjCard style={{ marginBottom: 20 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              {([
                ["full_name", "Nom complet *", "text"],
                ["phone", "Téléphone", "tel"],
                ["email", "E-mail", "email"],
                ["license_number", "N° de permis", "text"],
                ["license_expiry_date", "Expiration du permis", "date"],
                ["address", "Adresse", "text"],
                ["emergency_contact", "Contact d’urgence", "text"],
              ] as const).map(([key, label, type]) => (
                <div className="sj-field" key={key}>
                  <label>{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    required={key === "full_name"}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="sj-field">
                <label>Statut</label>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
              <div className="sj-field">
                <label>Photo du chauffeur</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
              </div>
              <div className="sj-field">
                <label>Photo du permis</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLicensePhoto(event.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="sj-field">
              <label>Notes</label>
              <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
            <button className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer le chauffeur"}
            </button>
          </form>
        </SjCard>
      ) : null}
      <div className="sj-grid sj-grid-4">
        {rows.map((d) => (
          <SjCard key={d.id}>
            <div className="sj-between">
              <div className="sj-avatar overflow-hidden">
                {d.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.photo_url} alt="" className="h-full w-full object-cover" />
                ) : d.full_name[0]}
              </div>
              <SjBadge tone={bookingStatusTone(d.status)}>{d.status}</SjBadge>
            </div>
            <h3 style={{ marginTop: 14 }}>{d.full_name}</h3>
            <div className="sj-muted">{d.phone || d.email || "—"}</div>
            <div className="sj-metric-sub">Permis : {d.license_number || "non renseigné"}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.license_photo_url ? (
                <button
                  className="sj-btn"
                  type="button"
                  onClick={() => {
                    void getDriverDocumentUrl(d.license_photo_url!).then((url) => window.open(url, "_blank", "noopener,noreferrer"));
                  }}
                >
                  Voir le permis
                </button>
              ) : null}
              <button className="sj-btn" type="button" onClick={() => edit(d)}>Modifier</button>
              {!d.user_id && d.email ? (
                <Link className="sj-btn" href={`/admin/utilisateurs?role=driver&resourceType=driver&resourceId=${d.id}&name=${encodeURIComponent(d.full_name)}&email=${encodeURIComponent(d.email)}`}>
                  Créer le compte
                </Link>
              ) : null}
              <button
                className="sj-btn text-[var(--color-error)]"
                type="button"
                onClick={() => {
                  if (!window.confirm("Supprimer ce chauffeur ?")) return;
                  void deleteDriver(d.id).then(() => setRows((current) => current.filter((row) => row.id !== d.id))).catch((failure) => setError(failure.message));
                }}
              >
                Supprimer
              </button>
            </div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? <SjCard><p className="sj-muted">Aucun chauffeur.</p></SjCard> : null}
    </>
  );
}
