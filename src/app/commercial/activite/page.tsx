"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  completeCrmActivity,
  createCrmActivity,
  crmTargetLabel,
  listCrmActivities,
  listCrmStaff,
  listCrmTargets,
  listOpenCrmActions,
  type CrmActivity,
  type CrmClientTarget,
  type CrmPartnerTarget,
  type CrmStaff,
  type CrmTargetType,
} from "@/lib/crmOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const CHANNELS = [
  ["appel", "Appel"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["visite", "Visite"],
  ["formulaire", "Formulaire"],
  ["autre", "Autre"],
] as const;

const MOTIFS = [
  ["demande_tarif", "Demande de tarif"],
  ["demande_devis", "Demande de devis"],
  ["demande_reservation", "Demande de réservation"],
  ["relance", "Relance"],
  ["reclamation", "Réclamation"],
  ["prospect_partenaire", "Prospect partenaire"],
  ["autre", "Autre"],
] as const;

function dateTimeFr(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function staffLabel(id: string | null, staff: CrmStaff[]): string {
  if (!id) return "Non assigné";
  return staff.find((s) => s.user_id === id)?.full_name ?? "Collaborateur";
}

export default function CommercialActivitePage() {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [actions, setActions] = useState<CrmActivity[]>([]);
  const [clients, setClients] = useState<CrmClientTarget[]>([]);
  const [partners, setPartners] = useState<CrmPartnerTarget[]>([]);
  const [staff, setStaff] = useState<CrmStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<CrmTargetType>("client");
  const [targetId, setTargetId] = useState("");
  const [channel, setChannel] = useState("appel");
  const [direction, setDirection] = useState("outbound");
  const [motif, setMotif] = useState("demande_tarif");
  const [subject, setSubject] = useState("");
  const [activityMessage, setActivityMessage] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [nextActionLabel, setNextActionLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recent, openActions, targets, team] = await Promise.all([
        listCrmActivities(100),
        listOpenCrmActions(100),
        listCrmTargets(),
        listCrmStaff(),
      ]);
      setActivities(recent);
      setActions(openActions);
      setClients(targets.clients);
      setPartners(targets.partners);
      setStaff(team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger l’activité.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const targets = targetType === "client" ? clients : partners;
  const now = Date.now();
  const overdueCount = useMemo(() => actions.filter((a) => a.next_action_at && new Date(a.next_action_at).getTime() < now).length, [actions, now]);

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!targetId) {
      setError("Choisissez un client ou un partenaire.");
      return;
    }
    setSaving(true);
    try {
      await createCrmActivity({
        targetType,
        targetId,
        channel,
        direction,
        motif,
        subject,
        message: activityMessage,
        nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
        nextActionLabel,
      });
      setSubject("");
      setActivityMessage("");
      setNextActionAt("");
      setNextActionLabel("");
      setMessage("Interaction enregistrée.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’enregistrer l’interaction.");
    } finally {
      setSaving(false);
    }
  }

  async function completeAction(id: string) {
    setError(null);
    try {
      await completeCrmActivity(id);
      setMessage("Relance marquée comme terminée.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de terminer cette action.");
    }
  }

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Commercial" title="Mon activité" />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}

      <div className="sj-grid sj-grid-2" style={{ marginBottom: 16 }}>
        <SjCard>
          <div className="sj-muted">Relances ouvertes</div>
          <div className="sj-metric">{actions.length}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En retard</div>
          <div className="sj-metric">{overdueCount}</div>
        </SjCard>
      </div>

      <SjSectionHead title="Nouvelle interaction" />
      <SjCard style={{ marginBottom: 20 }}>
        <form className="sj-form" onSubmit={submitActivity}>
          <div className="sj-form-grid">
            <div className="sj-field">
              <label>Type de dossier</label>
              <select value={targetType} onChange={(e) => { setTargetType(e.target.value as CrmTargetType); setTargetId(""); }}>
                <option value="client">Client</option>
                <option value="partner">Partenaire / prospect</option>
              </select>
            </div>
            <div className="sj-field">
              <label>Dossier *</label>
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                <option value="">Choisir…</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {"legal_name" in target
                      ? `${target.matricule ?? "SJP-PT"} · ${target.legal_name}`
                      : `${target.matricule ?? "SJP-CL"} · ${target.company_name || target.full_name || target.phone || "Client"}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Canal</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Motif</label>
              <select value={motif} onChange={(e) => setMotif(e.target.value)}>
                {MOTIFS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Objet</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. tarif Saint-Louis" />
            </div>
          </div>
          <div className="sj-field">
            <label>Compte-rendu</label>
            <textarea value={activityMessage} onChange={(e) => setActivityMessage(e.target.value)} rows={3} />
          </div>
          <div className="sj-form-grid">
            <div className="sj-field">
              <label>Prochaine relance</label>
              <input value={nextActionLabel} onChange={(e) => setNextActionLabel(e.target.value)} placeholder="Ex. rappeler pour confirmation" />
            </div>
            <div className="sj-field">
              <label>Échéance</label>
              <input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} />
            </div>
          </div>
          <button className="sj-btn sj-btn-primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer l’interaction"}
          </button>
        </form>
      </SjCard>

      <SjSectionHead title="Mes relances" />
      <div className="sj-list" style={{ marginBottom: 20 }}>
        {actions.map((action) => {
          const overdue = action.next_action_at && new Date(action.next_action_at).getTime() < Date.now();
          return (
            <SjCard key={action.id}>
              <div className="sj-between">
                <div>
                  <b>{action.next_action_label || action.subject || action.motif}</b>
                  <div className="sj-muted">{crmTargetLabel(action)} · {staffLabel(action.next_action_assignee, staff)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={overdue ? "danger" : "warning"}>{dateTimeFr(action.next_action_at)}</SjBadge>
                  <button className="sj-btn" type="button" style={{ marginTop: 8 }} onClick={() => void completeAction(action.id)}>
                    Terminer
                  </button>
                </div>
              </div>
            </SjCard>
          );
        })}
        {!actions.length ? <SjCard><p className="sj-muted">Aucune relance planifiée.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Interactions récentes" />
      <div className="sj-list">
        {activities.slice(0, 15).map((activity) => (
          <SjCard key={activity.id}>
            <div className="sj-between">
              <div>
                <b>{crmTargetLabel(activity)}</b>
                <div className="sj-muted">{activity.channel} · {activity.motif} · {activity.message || activity.subject || "—"}</div>
              </div>
              <span className="sj-muted">{dateTimeFr(activity.occurred_at)}</span>
            </div>
          </SjCard>
        ))}
        {!activities.length ? <SjCard><p className="sj-muted">Aucune interaction enregistrée.</p></SjCard> : null}
      </div>
    </>
  );
}
