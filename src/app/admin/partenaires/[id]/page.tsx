"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Entity360Workspace } from "@/components/admin/Entity360Workspace";
import { SjBadge, SjCard } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";

type Provider = {
  id: string;
  matricule: string | null;
  relation_kind: string;
  category: string;
  certification_status: string;
  legal_name: string;
  trade_name: string | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  city: string | null;
  country: string;
  user_id: string | null;
  partner_contract_id: string | null;
  notes: string | null;
  logo_url: string | null;
};

type Booking = {
  id: string;
  reference: string | null;
  status: string;
  pickup: string;
  dropoff: string;
  pickup_time: string;
  final_amount_fcfa: number | null;
  estimated_price: number | null;
};

type Activity = {
  id: string;
  channel: string;
  motif: string;
  subject: string | null;
  status: string;
  occurred_at: string;
  next_action_at: string | null;
  next_action_label: string | null;
};

type PartnerContract = {
  contract_number: string;
  status: string;
  start_date: string;
  end_date: string | null;
};

export default function AdminProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [contract, setContract] = useState<PartnerContract | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const providerResult = await supabase
        .from("partner_organizations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (providerResult.error) throw new Error(providerResult.error.message);
      if (!providerResult.data) throw new Error("Prestataire introuvable.");
      const row = providerResult.data as Provider;
      const [activityResult, bookingResult, contractResult] = await Promise.all([
        supabase
          .from("crm_activities")
          .select(
            "id,channel,motif,subject,status,occurred_at,next_action_at,next_action_label",
          )
          .eq("partner_org_id", id)
          .order("occurred_at", { ascending: false }),
        row.partner_contract_id
          ? supabase
              .from("bookings")
              .select(
                "id,reference,status,pickup,dropoff,pickup_time,final_amount_fcfa,estimated_price",
              )
              .eq("partner_contract_id", row.partner_contract_id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        row.partner_contract_id
          ? supabase
              .from("partner_contracts")
              .select("contract_number,status,start_date,end_date")
              .eq("id", row.partner_contract_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (activityResult.error) throw new Error(activityResult.error.message);
      if (bookingResult.error) throw new Error(bookingResult.error.message);
      if (contractResult.error) throw new Error(contractResult.error.message);
      setProvider(row);
      setActivities((activityResult.data ?? []) as Activity[]);
      setBookings((bookingResult.data ?? []) as Booking[]);
      setContract(contractResult.data as PartnerContract | null);
    };
    void load()
      .catch((failure) =>
        setError(failure instanceof Error ? failure.message : "Chargement impossible."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SjCard>Chargement du prestataire…</SjCard>;
  if (!provider) return <SjCard>{error || "Prestataire introuvable."}</SjCard>;

  const name = provider.trade_name || provider.legal_name;
  const turnover = bookings.reduce(
    (sum, booking) =>
      sum + Number(booking.final_amount_fcfa ?? booking.estimated_price ?? 0),
    0,
  );

  return (
    <Entity360Workspace
      entityType="provider"
      entityId={provider.id}
      backHref="/admin/partenaires"
      eyebrow="Prestataire commercial · vue 360"
      title={name}
      subtitle={provider.notes}
      imageUrl={provider.logo_url}
      status={provider.certification_status}
      facts={[
        { label: "Matricule", value: provider.matricule || "—" },
        { label: "Catégorie", value: provider.category },
        { label: "Contact", value: provider.primary_contact_name || "—" },
        { label: "Téléphone", value: provider.primary_contact_phone || "—" },
        { label: "E-mail", value: provider.primary_contact_email || "—" },
        {
          label: "Localisation",
          value: [provider.city, provider.country].filter(Boolean).join(", "),
        },
        { label: "Compte extranet", value: provider.user_id ? "Lié" : "Non créé" },
        {
          label: "Contrat commercial",
          value: contract?.contract_number || "Non lié",
        },
      ]}
      metrics={[
        { label: "Réservations apportées", value: bookings.length },
        {
          label: "Réalisées",
          value: bookings.filter((booking) => booking.status === "completed").length,
        },
        {
          label: "Volume d’affaires",
          value: `${turnover.toLocaleString("fr-FR")} F`,
        },
        { label: "Interactions CRM", value: activities.length },
      ]}
      overview={
        <div className="space-y-5">
          <SjCard>
            <h2 className="text-lg font-extrabold">Relation commerciale</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                <div className="sj-muted text-xs font-bold uppercase">Rôle</div>
                <b className="mt-1 block">
                  Revendeur / apporteur de services SentraJet
                </b>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                <div className="sj-muted text-xs font-bold uppercase">Contrat</div>
                <b className="mt-1 block">{contract?.contract_number || "À formaliser"}</b>
                <p className="sj-muted text-sm">
                  {contract
                    ? `${contract.status} · ${new Date(contract.start_date).toLocaleDateString("fr-FR")}`
                    : "Aucun contrat actif"}
                </p>
              </div>
            </div>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Dernières réservations apportées</h2>
            <div className="mt-4 space-y-3">
              {bookings.slice(0, 6).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
                >
                  <div className="sj-between gap-3">
                    <b>{booking.reference || booking.id.slice(0, 8)}</b>
                    <SjBadge tone="info">{booking.status}</SjBadge>
                  </div>
                  <p className="sj-muted mt-1 text-sm">
                    {booking.pickup} → {booking.dropoff}
                  </p>
                </div>
              ))}
            </div>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Interactions CRM</h2>
            <div className="mt-4 space-y-3">
              {activities.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
                >
                  <div className="sj-between gap-3">
                    <b>{activity.subject || activity.motif}</b>
                    <SjBadge tone="info">{activity.channel}</SjBadge>
                  </div>
                  <p className="sj-muted mt-1 text-xs">
                    {new Date(activity.occurred_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          </SjCard>
        </div>
      }
    />
  );
}
