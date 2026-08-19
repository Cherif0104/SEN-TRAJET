"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { createPartnerProspect, listCrmStaff, type CrmStaff } from "@/lib/crmOps";
import { supabase } from "@/lib/supabase";

type PartnerOrg = {
  id: string;
  matricule: string | null;
  legal_name: string;
  category: string;
  certification_status: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  city: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "danger"> = {
  actif: "success",
  approuve: "info",
  contrat_en_attente: "warning",
  en_verification: "warning",
  diagnostic: "info",
  prospect: "info",
  suspendu: "danger",
  archive: "danger",
};

const CATEGORIES = [
  ["hotel", "Hôtel"],
  ["conciergerie", "Conciergerie"],
  ["travel_agency", "Agence / tour-opérateur"],
  ["enterprise", "Entreprise / navettes salariés"],
  ["other", "Autre"],
] as const;

const NEEDS = [
  ["aibd", "Transferts AIBD"],
  ["navettes", "Navettes"],
  ["excursions", "Excursions"],
  ["mad", "Mise à disposition"],
  ["vip", "Transport VIP"],
  ["groupes", "Groupes / événements"],
] as const;

export default function AdminPartenairesPage() {
  const [rows, setRows] = useState<PartnerOrg[]>([]);
  const [staff, setStaff] = useState<CrmStaff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number][0]>("hotel");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [city, setCity] = useState("Dakar");
  const [estimatedVolume, setEstimatedVolume] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [certificationStatus, setCertificationStatus] = useState("prospect");
  const [nextActionAt, setNextActionAt] = useState("");
  const [nextActionLabel, setNextActionLabel] = useState("Réaliser le diagnostic partenaire");
  const [assignee, setAssignee] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const [partnersRes, team] = await Promise.all([
      supabase
        .from("partner_organizations")
        .select(
          "id, matricule, legal_name, category, certification_status, primary_contact_name, primary_contact_phone, primary_contact_email, city, notes, user_id, created_at"
        )
        .order("created_at", { ascending: false }),
      listCrmStaff(),
    ]);
    if (partnersRes.error) throw partnersRes.error;
    setRows((partnersRes.data ?? []) as PartnerOrg[]);
    setStaff(team);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Erreur partenaires"));
  }, [load]);

  function toggleNeed(value: string) {
    setNeeds((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function submitProspect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!legalName.trim()) {
      setError("La raison sociale est obligatoire.");
      return;
    }
    if (nextActionAt && !nextActionLabel.trim()) {
      setError("Indiquez la prochaine action prévue.");
      return;
    }
    setSaving(true);
    try {
      if (editingPartnerId) {
        const { error: updateError } = await supabase
          .from("partner_organizations")
          .update({
            legal_name: legalName.trim(),
            category,
            primary_contact_name: contactName.trim() || null,
            primary_contact_phone: contactPhone.trim() || null,
            primary_contact_email: contactEmail.trim() || null,
            city: city.trim() || null,
            notes: notes.trim() || null,
            certification_status: certificationStatus,
          })
          .eq("id", editingPartnerId);
        if (updateError) throw updateError;
        setMessage("Partenaire mis à jour.");
        setEditingPartnerId(null);
      } else {
      const prospect = await createPartnerProspect({
        legalName,
        category,
        contactName,
        contactPhone,
        contactEmail,
        city,
        notes,
        estimatedMonthlyVolume: estimatedVolume ? Number(estimatedVolume) : null,
        needs,
        nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
        nextActionLabel,
        nextActionAssignee: assignee || null,
      });
      setMessage(
        `${prospect.matricule ?? "Prospect"} créé. Aucun compte partenaire n’a été ouvert.`
      );
      }
      setLegalName("");
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setEstimatedVolume("");
      setNeeds([]);
      setNotes("");
      setNextActionAt("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer le prospect.");
    } finally {
      setSaving(false);
    }
  }

  function editPartner(partner: PartnerOrg) {
    setEditingPartnerId(partner.id);
    setLegalName(partner.legal_name);
    setCategory(partner.category as typeof category);
    setContactName(partner.primary_contact_name ?? "");
    setContactPhone(partner.primary_contact_phone ?? "");
    setContactEmail(partner.primary_contact_email ?? "");
    setCity(partner.city ?? "Dakar");
    setNotes(partner.notes ?? "");
    setCertificationStatus(partner.certification_status);
    setShowForm(true);
  }

  return (
    <>
      <SjSectionHead
        eyebrow="Réseau"
        title="Prestataires commerciaux"
        action={
          <button className="sj-btn sj-btn-primary" type="button" onClick={() => {
            setEditingPartnerId(null);
            setShowForm((v) => !v);
          }}>
            {showForm ? "Fermer" : "+ Nouveau prospect"}
          </button>
        }
      />
      <SjCard style={{ marginBottom: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Funnel certification — pas de compte Auth avant statut ACTIF. Un seul CRM maître SentraJet.
          L’espace partenaire externe reste limité. Propriétaires de véhicules :{" "}
          <Link href="/admin/proprietaires" className="underline">
            Propriétaires
          </Link>
          .
        </p>
      </SjCard>

      {error ? <p className="rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-950/40 p-3 text-sm text-emerald-200">{message}</p> : null}

      {showForm ? (
        <>
          <SjSectionHead title={editingPartnerId ? "Modifier le prestataire" : "Nouveau prospect prestataire"} />
          <SjCard style={{ marginBottom: 20 }}>
            <form className="sj-form" onSubmit={submitProspect}>
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Raison sociale *</label>
                  <input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ex. Hôtel Teranga"
                    required
                  />
                </div>
                <div className="sj-field">
                  <label>Catégorie *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sj-field">
                  <label>Contact principal</label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nom et prénom"
                  />
                </div>
                <div className="sj-field">
                  <label>Téléphone / WhatsApp</label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+221 …"
                  />
                </div>
                <div className="sj-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@entreprise.sn"
                  />
                </div>
                <div className="sj-field">
                  <label>Ville</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                {editingPartnerId ? (
                  <div className="sj-field">
                    <label>Certification</label>
                    <select value={certificationStatus} onChange={(e) => setCertificationStatus(e.target.value)}>
                      <option value="prospect">Prospect</option>
                      <option value="diagnostic">Diagnostic</option>
                      <option value="en_verification">En vérification</option>
                      <option value="contrat_en_attente">Contrat en attente</option>
                      <option value="actif">Actif</option>
                      <option value="suspendu">Suspendu</option>
                      <option value="archive">Archivé</option>
                    </select>
                  </div>
                ) : null}
                <div className="sj-field">
                  <label>Volume mensuel estimé</label>
                  <input
                    type="number"
                    min={0}
                    value={estimatedVolume}
                    onChange={(e) => setEstimatedVolume(e.target.value)}
                    placeholder="Nombre de prestations"
                  />
                </div>
              </div>

              <fieldset className="sj-field">
                <legend>Besoins identifiés</legend>
                <div className="flex flex-wrap gap-2">
                  {NEEDS.map(([value, label]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-full border px-3 py-2 text-xs ${
                        needs.includes(value) ? "border-amber-400 bg-amber-400/10" : "border-neutral-700"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={needs.includes(value)}
                        onChange={() => toggleNeed(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="sj-field">
                <label>Notes du premier contact</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contexte, volume, contraintes, décisionnaires…"
                />
              </div>

              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Prochaine action</label>
                  <input
                    value={nextActionLabel}
                    onChange={(e) => setNextActionLabel(e.target.value)}
                  />
                </div>
                <div className="sj-field">
                  <label>Échéance</label>
                  <input
                    type="datetime-local"
                    value={nextActionAt}
                    onChange={(e) => setNextActionAt(e.target.value)}
                  />
                </div>
                <div className="sj-field">
                  <label>Responsable</label>
                  <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">Moi-même</option>
                    {staff.map((person) => (
                      <option key={`${person.user_id}-${person.role}`} value={person.user_id}>
                        {person.full_name} · {person.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="sj-btn sj-btn-primary" type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : editingPartnerId ? "Enregistrer les modifications" : "Créer le prospect"}
              </button>
              <p className="sj-muted text-xs">
                Création atomique : partenaire PROSPECT + activité CRM + audit. Aucun utilisateur Auth.
              </p>
            </form>
          </SjCard>
        </>
      ) : null}

      <SjSectionHead title="Funnel de certification" />
      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table sj-responsive-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Organisation</th>
                <th>Catégorie</th>
                <th>Contact</th>
                <th>Certification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((partner) => (
                <tr key={partner.id}>
                  <td data-label="Matricule">
                    <code>{partner.matricule ?? "—"}</code>
                  </td>
                  <td data-label="Organisation">
                    <b>{partner.legal_name}</b>
                  </td>
                  <td data-label="Catégorie">{CATEGORIES.find(([value]) => value === partner.category)?.[1] ?? partner.category}</td>
                  <td data-label="Contact">
                    {partner.primary_contact_name ?? "—"}
                    <div className="sj-muted text-xs">
                      {partner.primary_contact_phone || partner.primary_contact_email || "—"}
                    </div>
                  </td>
                  <td data-label="Certification">
                    <SjBadge tone={STATUS_TONE[partner.certification_status] ?? "info"}>
                      {partner.certification_status}
                    </SjBadge>
                  </td>
                  <td data-label="Actions">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="sj-btn sj-btn-primary"
                        href={`/admin/partenaires/${partner.id}`}
                      >
                        Vue 360
                      </Link>
                      <button className="sj-btn" type="button" onClick={() => editPartner(partner)}>
                        Modifier
                      </button>
                      {!partner.user_id &&
                      partner.primary_contact_email &&
                      partner.certification_status === "actif" ? (
                        <Link
                          className="sj-btn"
                          href={`/admin/utilisateurs?role=partner&resourceType=partner&resourceId=${partner.id}&name=${encodeURIComponent(partner.legal_name)}&email=${encodeURIComponent(partner.primary_contact_email)}`}
                        >
                          Créer le compte
                        </Link>
                      ) : null}
                      <button
                        className="sj-btn text-[var(--color-error)]"
                        type="button"
                        onClick={() => {
                          if (!window.confirm("Supprimer ce partenaire ?")) return;
                          void supabase
                            .from("partner_organizations")
                            .delete()
                            .eq("id", partner.id)
                            .then(({ error: deleteError }) => {
                              if (deleteError) {
                                setError(deleteError.message);
                              } else {
                                setRows((current) => current.filter((row) => row.id !== partner.id));
                              }
                            });
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="sj-muted" style={{ marginTop: 12 }}>
            Aucun prospect / partenaire. Utilisez « Nouveau prospect » après un contact WhatsApp.
          </p>
        ) : null}
      </SjCard>
    </>
  );
}
