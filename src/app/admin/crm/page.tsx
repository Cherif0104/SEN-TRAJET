"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { listIncompleteBookings, type PlatformBooking } from "@/lib/platformOps";

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
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function staffLabel(id: string | null, staff: CrmStaff[]): string {
  if (!id) return "Non assigné";
  return staff.find((s) => s.user_id === id)?.full_name ?? "Collaborateur";
}

export default function AdminCrmPage() {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [actions, setActions] = useState<CrmActivity[]>([]);
  const [incomplete, setIncomplete] = useState<PlatformBooking[]>([]);
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
  const [direction, setDirection] = useState("inbound");
  const [motif, setMotif] = useState("demande_tarif");
  const [subject, setSubject] = useState("");
  const [activityMessage, setActivityMessage] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [nextActionLabel, setNextActionLabel] = useState("");
  const [nextActionAssignee, setNextActionAssignee] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recent, openActions, targets, team, pendingBookings] = await Promise.all([
        listCrmActivities(100),
        listOpenCrmActions(100),
        listCrmTargets(),
        listCrmStaff(),
        listIncompleteBookings(),
      ]);
      setActivities(recent);
      setActions(openActions);
      setClients(targets.clients);
      setPartners(targets.partners);
      setStaff(team);
      setIncomplete(pendingBookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le CRM.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const targets = targetType === "client" ? clients : partners;
  const now = Date.now();
  const overdueCount = useMemo(
    () => actions.filter((a) => a.next_action_at && new Date(a.next_action_at).getTime() < now).length,
    [actions, now]
  );
  const nextSevenDays = useMemo(
    () =>
      actions.filter((a) => {
        if (!a.next_action_at) return false;
        const t = new Date(a.next_action_at).getTime();
        return t >= now && t <= now + 7 * 24 * 60 * 60 * 1000;
      }).length,
    [actions, now]
  );

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!targetId) {
      setError("Choisissez un client ou un partenaire.");
      return;
    }
    if (nextActionAt && !nextActionLabel.trim()) {
      setError("Renseignez le libellé de la prochaine action.");
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
        nextActionAssignee: nextActionAssignee || null,
      });
      setSubject("");
      setActivityMessage("");
      setNextActionAt("");
      setNextActionLabel("");
      setMessage("Interaction enregistrée et journalisée.");
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
      setMessage("Action marquée comme terminée.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de terminer cette action.");
    }
  }

  return (
    <>
      <SjSectionHead
        eyebrow="CRM maître SentraJet"
        title="Interactions & prochaines actions"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/partenaires" className="sj-btn">
              + Prospect partenaire
            </Link>
            <Link href="/admin/clients" className="sj-btn">
              Fiches clients →
            </Link>
          </div>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Chaque interaction conserve le collaborateur, le motif et la relance. Les partenaires n’accèdent
        jamais à ce CRM.
      </p>

      {error ? <p className="rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-950/40 p-3 text-sm text-emerald-200">{message}</p> : null}

      <div className="sj-grid sj-grid-3" style={{ marginBottom: 16 }}>
        <SjCard>
          <div className="sj-muted">Actions ouvertes</div>
          <div className="sj-metric">{actions.length}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En retard</div>
          <div className="sj-metric">{overdueCount}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">À faire sous 7 jours</div>
          <div className="sj-metric">{nextSevenDays}</div>
        </SjCard>
      </div>

      <SjSectionHead title="Nouvelle interaction" />
      <SjCard style={{ marginBottom: 20 }}>
        <form className="sj-form" onSubmit={submitActivity}>
          <div className="sj-form-grid">
            <div className="sj-field">
              <label>Type de dossier</label>
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as CrmTargetType);
                  setTargetId("");
                }}
              >
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
                      : `${target.matricule ?? "SJP-CL"} · ${
                          target.company_name || target.full_name || target.phone || "Client"
                        }`}
                  </option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Canal</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Direction</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="inbound">Entrant</option>
                <option value="outbound">Sortant</option>
                <option value="internal">Interne</option>
              </select>
            </div>
            <div className="sj-field">
              <label>Motif</label>
              <select value={motif} onChange={(e) => setMotif(e.target.value)}>
                {MOTIFS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
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
            <textarea
              value={activityMessage}
              onChange={(e) => setActivityMessage(e.target.value)}
              rows={3}
              placeholder="Ce que le client demande, décision prise…"
            />
          </div>
          <div className="sj-form-grid">
            <div className="sj-field">
              <label>Prochaine action</label>
              <input
                value={nextActionLabel}
                onChange={(e) => setNextActionLabel(e.target.value)}
                placeholder="Ex. rappeler pour confirmation"
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
              <select value={nextActionAssignee} onChange={(e) => setNextActionAssignee(e.target.value)}>
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
            {saving ? "Enregistrement…" : "Enregistrer l’interaction"}
          </button>
        </form>
      </SjCard>

      <SjSectionHead title="Agenda CRM" />
      <SjCard style={{ marginBottom: 20 }}>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Échéance</th>
                <th>Dossier</th>
                <th>Action</th>
                <th>Responsable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => {
                const overdue =
                  action.next_action_at && new Date(action.next_action_at).getTime() < Date.now();
                return (
                  <tr key={action.id}>
                    <td>
                      <SjBadge tone={overdue ? "danger" : "warning"}>
                        {dateTimeFr(action.next_action_at)}
                      </SjBadge>
                    </td>
                    <td>{crmTargetLabel(action)}</td>
                    <td>{action.next_action_label || action.subject || action.motif}</td>
                    <td>{staffLabel(action.next_action_assignee, staff)}</td>
                    <td>
                      <button className="sj-btn" type="button" onClick={() => void completeAction(action.id)}>
                        Terminer
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!actions.length ? (
                <tr>
                  <td colSpan={5} className="sj-muted">
                    Aucune action planifiée.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SjCard>

      <SjSectionHead title="Interactions récentes" />
      <SjCard style={{ marginBottom: 20 }}>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Dossier</th>
                <th>Canal / motif</th>
                <th>Compte-rendu</th>
                <th>Traité par</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td>{dateTimeFr(activity.occurred_at)}</td>
                  <td>{crmTargetLabel(activity)}</td>
                  <td>
                    {activity.channel} · {activity.motif}
                  </td>
                  <td>{activity.message || activity.subject || "—"}</td>
                  <td>{staffLabel(activity.handled_by, staff)}</td>
                </tr>
              ))}
              {!activities.length && !loading ? (
                <tr>
                  <td colSpan={5} className="sj-muted">
                    Aucune interaction enregistrée.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SjCard>

      <SjSectionHead title="Demandes non finalisées" />
      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Trajet</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {incomplete.slice(0, 20).map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.reference || booking.id.slice(0, 8)}</td>
                  <td>{booking.client?.company_name || booking.client?.full_name || "—"}</td>
                  <td>
                    {booking.pickup} → {booking.dropoff}
                  </td>
                  <td>{booking.status}</td>
                </tr>
              ))}
              {!incomplete.length ? (
                <tr>
                  <td colSpan={4} className="sj-muted">
                    Aucune demande en attente.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SjCard>
    </>
  );
}
