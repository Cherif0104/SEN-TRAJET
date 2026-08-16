"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  FileCheck2,
  History,
  Plus,
  ReceiptText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  addEntityCase,
  addEntityContract,
  addFinancialRecord,
  addTimelineEntry,
  addVehicleMaintenance,
  loadEntity360,
  signedEntityDocumentUrl,
  updateEntityCaseStatus,
  uploadEntityDocument,
  type Entity360Data,
  type Entity360Type,
} from "@/lib/entity360";
import { SjBadge, SjCard } from "@/components/sentrajet/PremiumShell";

type Fact = { label: string; value: React.ReactNode };
type Metric = { label: string; value: React.ReactNode; detail?: string };

type Props = {
  entityType: Entity360Type;
  entityId: string;
  backHref: string;
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  imageUrl?: string | null;
  facts: Fact[];
  metrics?: Metric[];
  overview?: React.ReactNode;
};

const emptyData: Entity360Data = {
  timeline: [],
  cases: [],
  contracts: [],
  documents: [],
  financialRecords: [],
  maintenance: [],
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";

const formatMoney = (value?: number | null) =>
  value == null ? "—" : `${value.toLocaleString("fr-FR")} FCFA`;

function InlineForm({
  title,
  children,
  onSubmit,
  saving,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <SjCard className="mb-4 border border-[var(--color-accent)]/20">
      <h3 className="mb-4 text-base font-extrabold">{title}</h3>
      <form className="sj-form" onSubmit={onSubmit}>
        {children}
        <button className="sj-btn sj-btn-primary w-fit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </SjCard>
  );
}

export function Entity360Workspace({
  entityType,
  entityId,
  backHref,
  eyebrow,
  title,
  subtitle,
  status,
  imageUrl,
  facts,
  metrics = [],
  overview,
}: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<Entity360Data>(emptyData);
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadEntity360(entityType, entityId));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Vue d’ensemble", icon: ShieldCheck },
      {
        id: "timeline",
        label: `Chronologie (${data.timeline.length})`,
        icon: History,
      },
      {
        id: "cases",
        label: `Dossiers (${data.cases.length})`,
        icon: BriefcaseBusiness,
      },
      {
        id: "contracts",
        label: `Contrats (${data.contracts.length})`,
        icon: FileCheck2,
      },
      {
        id: "documents",
        label: `Documents (${data.documents.length})`,
        icon: FileCheck2,
      },
      {
        id: "finance",
        label: `Finance (${data.financialRecords.length})`,
        icon: ReceiptText,
      },
      ...(entityType === "vehicle"
        ? [
            {
              id: "maintenance",
              label: `Entretien (${data.maintenance.length})`,
              icon: Wrench,
            },
          ]
        : []),
    ],
    [data, entityType],
  );

  const submit = async (action: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      setForm(null);
      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link className="sj-btn w-fit" href={backHref}>
        <ArrowLeft className="h-4 w-4" />
        Retour à la liste
      </Link>

      <SjCard className="overflow-hidden">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-accent-soft)] text-3xl font-black text-[var(--color-accent)]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              title.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {eyebrow}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {title}
              </h1>
              {status ? <SjBadge tone="info">{status}</SjBadge> : null}
            </div>
            {subtitle ? <p className="sj-muted mt-1">{subtitle}</p> : null}
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {fact.label}
              </div>
              <div className="mt-1 break-words font-semibold">
                {fact.value || "—"}
              </div>
            </div>
          ))}
        </div>
      </SjCard>

      {metrics.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <SjCard key={metric.label}>
              <div className="sj-muted text-xs font-bold uppercase tracking-wide">
                {metric.label}
              </div>
              <div className="mt-2 text-2xl font-black">{metric.value}</div>
              {metric.detail ? (
                <div className="sj-muted mt-1 text-xs">{metric.detail}</div>
              ) : null}
            </SjCard>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`sj-btn ${tab === item.id ? "sj-btn-primary" : ""}`}
                onClick={() => {
                  setTab(item.id);
                  setForm(null);
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-[var(--color-error)]"
        >
          {error}
        </p>
      ) : null}
      {loading ? <SjCard>Chargement de la fiche 360…</SjCard> : null}

      {!loading && tab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div>{overview}</div>
          <SjCard>
            <h2 className="text-lg font-extrabold">Alertes et échéances</h2>
            <div className="mt-4 space-y-3">
              {data.contracts
                .filter((item) => item.end_date)
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="rounded-xl bg-amber-500/10 p-3">
                    <b>{item.contract_number}</b>
                    <div className="sj-muted text-sm">
                      Fin le {formatDate(item.end_date)}
                    </div>
                  </div>
                ))}
              {data.documents
                .filter((item) => item.expires_at)
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="rounded-xl bg-blue-500/10 p-3">
                    <b>{item.name}</b>
                    <div className="sj-muted text-sm">
                      Expire le {formatDate(item.expires_at)}
                    </div>
                  </div>
                ))}
              {!data.contracts.some((item) => item.end_date) &&
              !data.documents.some((item) => item.expires_at) ? (
                <p className="sj-muted text-sm">Aucune échéance enregistrée.</p>
              ) : null}
            </div>
          </SjCard>
        </div>
      ) : null}

      {!loading && tab === "timeline" ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Chronologie complète</h2>
            <button
              className="sj-btn sj-btn-primary"
              type="button"
              onClick={() => setForm(form === "timeline" ? null : "timeline")}
            >
              <Plus className="h-4 w-4" /> Ajouter une note
            </button>
          </div>
          {form === "timeline" ? (
            <InlineForm
              title="Nouvel événement"
              saving={saving}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void submit(() =>
                  addTimelineEntry(entityType, entityId, {
                    eventType: String(values.get("event_type") || "note"),
                    title: String(values.get("title") || ""),
                    description: String(values.get("description") || "") || null,
                  }),
                );
              }}
            >
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Type</label>
                  <select name="event_type">
                    <option value="note">Note</option>
                    <option value="call">Appel</option>
                    <option value="meeting">Réunion</option>
                    <option value="status_change">Changement de statut</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Titre *</label>
                  <input name="title" required />
                </div>
              </div>
              <div className="sj-field">
                <label>Détails</label>
                <textarea name="description" rows={3} />
              </div>
            </InlineForm>
          ) : null}
          <div className="space-y-3">
            {data.timeline.map((entry) => (
              <SjCard key={entry.id}>
                <div className="flex gap-3">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{entry.title}</b>
                      <SjBadge tone="info">{entry.event_type}</SjBadge>
                    </div>
                    {entry.description ? (
                      <p className="sj-muted mt-1 text-sm">{entry.description}</p>
                    ) : null}
                    <p className="sj-muted mt-2 text-xs">
                      {formatDate(entry.occurred_at)}
                    </p>
                  </div>
                </div>
              </SjCard>
            ))}
            {!data.timeline.length ? (
              <SjCard>
                <p className="sj-muted">Aucun événement enregistré.</p>
              </SjCard>
            ) : null}
          </div>
        </section>
      ) : null}

      {!loading && tab === "cases" ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Dossiers de suivi</h2>
            <button
              className="sj-btn sj-btn-primary"
              type="button"
              onClick={() => setForm(form === "case" ? null : "case")}
            >
              <Plus className="h-4 w-4" /> Ouvrir un dossier
            </button>
          </div>
          {form === "case" ? (
            <InlineForm
              title="Nouveau dossier"
              saving={saving}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void submit(() =>
                  addEntityCase(entityType, entityId, {
                    caseType: String(values.get("case_type") || "follow_up"),
                    title: String(values.get("title") || ""),
                    description: String(values.get("description") || "") || null,
                    priority: String(values.get("priority") || "normal"),
                    dueAt: String(values.get("due_at") || "") || null,
                  }),
                );
              }}
            >
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Nature</label>
                  <select name="case_type">
                    <option value="follow_up">Suivi</option>
                    <option value="care">Prise en charge</option>
                    <option value="incident">Incident</option>
                    <option value="complaint">Réclamation</option>
                    <option value="compliance">Conformité</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Priorité</label>
                  <select name="priority">
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="critical">Critique</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Titre *</label>
                  <input name="title" required />
                </div>
                <div className="sj-field">
                  <label>Échéance</label>
                  <input name="due_at" type="datetime-local" />
                </div>
              </div>
              <div className="sj-field">
                <label>Description</label>
                <textarea name="description" rows={3} />
              </div>
            </InlineForm>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {data.cases.map((item) => (
              <SjCard key={item.id}>
                <div className="sj-between gap-3">
                  <b>{item.title}</b>
                  <SjBadge tone={item.priority === "critical" ? "danger" : "info"}>
                    {item.priority}
                  </SjBadge>
                </div>
                <p className="sj-muted mt-2 text-sm">
                  {item.description || item.case_type}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    aria-label={`Statut de ${item.title}`}
                    className="min-h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                    value={item.status}
                    onChange={(event) =>
                      void submit(() =>
                        updateEntityCaseStatus(item.id, event.target.value),
                      )
                    }
                  >
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="blocked">Bloqué</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Clos</option>
                  </select>
                  {item.due_at ? (
                    <span className="sj-muted text-xs">
                      Échéance {formatDate(item.due_at)}
                    </span>
                  ) : null}
                </div>
              </SjCard>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "contracts" ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Historique contractuel</h2>
            <button
              className="sj-btn sj-btn-primary"
              type="button"
              onClick={() => setForm(form === "contract" ? null : "contract")}
            >
              <Plus className="h-4 w-4" /> Nouveau contrat
            </button>
          </div>
          {form === "contract" ? (
            <InlineForm
              title="Référencer un contrat"
              saving={saving}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void submit(() =>
                  addEntityContract(entityType, entityId, {
                    contractNumber: String(values.get("contract_number") || ""),
                    contractType: String(values.get("contract_type") || ""),
                    status: String(values.get("status") || "draft"),
                    startDate: String(values.get("start_date") || "") || null,
                    endDate: String(values.get("end_date") || "") || null,
                    amountFcfa: Number(values.get("amount_fcfa")) || null,
                    billingFrequency:
                      String(values.get("billing_frequency") || "") || null,
                    termsSummary:
                      String(values.get("terms_summary") || "") || null,
                  }),
                );
              }}
            >
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Numéro *</label>
                  <input name="contract_number" required />
                </div>
                <div className="sj-field">
                  <label>Type *</label>
                  <input name="contract_type" required placeholder="Cadre, location, emploi…" />
                </div>
                <div className="sj-field">
                  <label>Statut</label>
                  <select name="status">
                    <option value="draft">Brouillon</option>
                    <option value="pending_signature">À signer</option>
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="expired">Expiré</option>
                    <option value="terminated">Résilié</option>
                    <option value="renewed">Renouvelé</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Montant FCFA</label>
                  <input name="amount_fcfa" type="number" min="0" />
                </div>
                <div className="sj-field">
                  <label>Début</label>
                  <input name="start_date" type="date" />
                </div>
                <div className="sj-field">
                  <label>Fin</label>
                  <input name="end_date" type="date" />
                </div>
                <div className="sj-field">
                  <label>Fréquence de facturation</label>
                  <input name="billing_frequency" placeholder="Mensuelle, annuelle…" />
                </div>
              </div>
              <div className="sj-field">
                <label>Résumé des conditions</label>
                <textarea name="terms_summary" rows={3} />
              </div>
            </InlineForm>
          ) : null}
          <div className="space-y-3">
            {data.contracts.map((item) => (
              <SjCard key={item.id}>
                <div className="sj-between gap-3">
                  <div>
                    <b>{item.contract_number}</b>
                    <div className="sj-muted text-sm">{item.contract_type}</div>
                  </div>
                  <SjBadge tone={item.status === "active" ? "success" : "info"}>
                    {item.status}
                  </SjBadge>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <span>Début : {formatDate(item.start_date)}</span>
                  <span>Fin : {formatDate(item.end_date)}</span>
                  <span>Montant : {formatMoney(item.amount_fcfa)}</span>
                </div>
                {item.terms_summary ? (
                  <p className="sj-muted mt-3 text-sm">{item.terms_summary}</p>
                ) : null}
              </SjCard>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "documents" ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Documents et conformité</h2>
            <button
              className="sj-btn sj-btn-primary"
              type="button"
              onClick={() => setForm(form === "document" ? null : "document")}
            >
              <Plus className="h-4 w-4" /> Ajouter un document
            </button>
          </div>
          {form === "document" ? (
            <InlineForm
              title="Téléverser un document privé"
              saving={saving}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const file = values.get("file");
                if (!(file instanceof File) || !file.size || !user) return;
                void submit(() =>
                  uploadEntityDocument(user.id, entityType, entityId, {
                    file,
                    documentType: String(values.get("document_type") || "other"),
                    name: String(values.get("name") || file.name),
                    expiresAt: String(values.get("expires_at") || "") || null,
                  }),
                );
              }}
            >
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Type</label>
                  <select name="document_type">
                    <option value="identity">Identité / KYC</option>
                    <option value="contract">Contrat signé</option>
                    <option value="license">Permis</option>
                    <option value="cv">CV</option>
                    <option value="registration">Carte grise</option>
                    <option value="insurance">Assurance</option>
                    <option value="invoice">Facture</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Nom *</label>
                  <input name="name" required />
                </div>
                <div className="sj-field">
                  <label>Expiration</label>
                  <input name="expires_at" type="date" />
                </div>
                <div className="sj-field">
                  <label>Fichier *</label>
                  <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                  />
                </div>
              </div>
            </InlineForm>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {data.documents.map((item) => (
              <SjCard key={item.id}>
                <div className="sj-between gap-3">
                  <div>
                    <b>{item.name}</b>
                    <div className="sj-muted text-sm">{item.document_type}</div>
                  </div>
                  <SjBadge tone={item.status === "valid" ? "success" : "info"}>
                    {item.status}
                  </SjBadge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="sj-muted text-xs">
                    Expire : {formatDate(item.expires_at)}
                  </span>
                  <button
                    className="sj-btn"
                    type="button"
                    onClick={() =>
                      void signedEntityDocumentUrl(item.storage_path).then((url) =>
                        window.open(url, "_blank", "noopener,noreferrer"),
                      )
                    }
                  >
                    Ouvrir
                  </button>
                </div>
              </SjCard>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "finance" ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Factures et flux financiers</h2>
            <button
              className="sj-btn sj-btn-primary"
              type="button"
              onClick={() => setForm(form === "finance" ? null : "finance")}
            >
              <Plus className="h-4 w-4" /> Nouvelle écriture
            </button>
          </div>
          {form === "finance" ? (
            <InlineForm
              title="Ajouter une facture ou une écriture"
              saving={saving}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void submit(() =>
                  addFinancialRecord(entityType, entityId, {
                    recordType: String(values.get("record_type") || "invoice"),
                    reference: String(values.get("reference") || ""),
                    label: String(values.get("label") || "") || null,
                    amountFcfa: Number(values.get("amount_fcfa")) || 0,
                    status: String(values.get("status") || "pending"),
                    issueDate: String(values.get("issue_date") || "") || null,
                    dueDate: String(values.get("due_date") || "") || null,
                  }),
                );
              }}
            >
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Nature</label>
                  <select name="record_type">
                    <option value="invoice">Facture</option>
                    <option value="payment">Paiement</option>
                    <option value="credit_note">Avoir</option>
                    <option value="commission">Commission</option>
                    <option value="rent">Loyer</option>
                    <option value="loan_installment">Échéance de prêt</option>
                    <option value="investment">Investissement</option>
                    <option value="expense">Dépense</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Référence *</label>
                  <input name="reference" required />
                </div>
                <div className="sj-field">
                  <label>Libellé</label>
                  <input name="label" />
                </div>
                <div className="sj-field">
                  <label>Montant FCFA *</label>
                  <input name="amount_fcfa" type="number" min="0" required />
                </div>
                <div className="sj-field">
                  <label>Statut</label>
                  <select name="status">
                    <option value="draft">Brouillon</option>
                    <option value="pending">En attente</option>
                    <option value="due">À payer</option>
                    <option value="partially_paid">Partiel</option>
                    <option value="paid">Payé</option>
                    <option value="overdue">En retard</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Date d’émission</label>
                  <input name="issue_date" type="date" />
                </div>
                <div className="sj-field">
                  <label>Échéance</label>
                  <input name="due_date" type="date" />
                </div>
              </div>
            </InlineForm>
          ) : null}
          <div className="space-y-3">
            {data.financialRecords.map((item) => (
              <SjCard key={item.id}>
                <div className="sj-between gap-3">
                  <div>
                    <b>{item.reference}</b>
                    <div className="sj-muted text-sm">
                      {item.label || item.record_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <b>{formatMoney(item.amount_fcfa)}</b>
                    <div>
                      <SjBadge tone={item.status === "paid" ? "success" : "info"}>
                        {item.status}
                      </SjBadge>
                    </div>
                  </div>
                </div>
                <div className="sj-muted mt-3 text-xs">
                  Émise le {formatDate(item.issue_date)} · Échéance{" "}
                  {formatDate(item.due_date)}
                </div>
              </SjCard>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "maintenance" ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Cycle d’entretien</h2>
            <button
              className="sj-btn sj-btn-primary"
              type="button"
              onClick={() => setForm(form === "maintenance" ? null : "maintenance")}
            >
              <Plus className="h-4 w-4" /> Planifier
            </button>
          </div>
          {form === "maintenance" ? (
            <InlineForm
              title="Nouvelle intervention"
              saving={saving}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void submit(() =>
                  addVehicleMaintenance(entityId, {
                    maintenanceType: String(
                      values.get("maintenance_type") || "preventive",
                    ),
                    title: String(values.get("title") || ""),
                    status: String(values.get("status") || "planned"),
                    scheduledAt:
                      String(values.get("scheduled_at") || "") || null,
                    odometerKm: Number(values.get("odometer_km")) || null,
                    costFcfa: Number(values.get("cost_fcfa")) || null,
                    serviceProvider:
                      String(values.get("service_provider") || "") || null,
                    notes: String(values.get("notes") || "") || null,
                    nextDueAt: String(values.get("next_due_at") || "") || null,
                  }),
                );
              }}
            >
              <div className="sj-form-grid">
                <div className="sj-field">
                  <label>Nature</label>
                  <select name="maintenance_type">
                    <option value="preventive">Préventif</option>
                    <option value="repair">Réparation</option>
                    <option value="inspection">Contrôle</option>
                    <option value="tires">Pneumatiques</option>
                    <option value="oil_change">Vidange</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Intitulé *</label>
                  <input name="title" required />
                </div>
                <div className="sj-field">
                  <label>Statut</label>
                  <select name="status">
                    <option value="planned">Planifié</option>
                    <option value="scheduled">Programmé</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                  </select>
                </div>
                <div className="sj-field">
                  <label>Date</label>
                  <input name="scheduled_at" type="datetime-local" />
                </div>
                <div className="sj-field">
                  <label>Kilométrage</label>
                  <input name="odometer_km" type="number" min="0" />
                </div>
                <div className="sj-field">
                  <label>Coût FCFA</label>
                  <input name="cost_fcfa" type="number" min="0" />
                </div>
                <div className="sj-field">
                  <label>Prestataire atelier</label>
                  <input name="service_provider" />
                </div>
                <div className="sj-field">
                  <label>Prochaine échéance</label>
                  <input name="next_due_at" type="datetime-local" />
                </div>
              </div>
              <div className="sj-field">
                <label>Notes</label>
                <textarea name="notes" rows={3} />
              </div>
            </InlineForm>
          ) : null}
          <div className="space-y-3">
            {data.maintenance.map((item) => (
              <SjCard key={item.id}>
                <div className="sj-between gap-3">
                  <div>
                    <b>{item.title}</b>
                    <div className="sj-muted text-sm">
                      {item.maintenance_type} · {item.service_provider || "Interne"}
                    </div>
                  </div>
                  <SjBadge tone={item.status === "completed" ? "success" : "info"}>
                    {item.status}
                  </SjBadge>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <span>Date : {formatDate(item.scheduled_at)}</span>
                  <span>Compteur : {item.odometer_km ?? "—"} km</span>
                  <span>Coût : {formatMoney(item.cost_fcfa)}</span>
                </div>
              </SjCard>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
