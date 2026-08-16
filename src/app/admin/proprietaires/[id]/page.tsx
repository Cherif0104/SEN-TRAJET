"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Entity360Workspace } from "@/components/admin/Entity360Workspace";
import { SjBadge, SjCard } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";

type AssetPartner = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  status: string;
  matricule: string | null;
  relation_subtype: string | null;
  partner_kind: string;
  address: string | null;
  notes: string | null;
  committed_amount_fcfa: number | null;
};

type Contract = {
  id: string;
  vehicle_id: string | null;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  terms_summary: string | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plate_number: string;
    photo_url: string | null;
  } | null;
};

const partnerKinds: Record<string, string> = {
  asset_owner: "Propriétaire d’actif",
  bank: "Banque / financeur",
  lessor: "Bailleur",
  hire_purchase: "Location-vente",
  shareholder: "Actionnaire",
  investor: "Investisseur",
  other: "Autre partenaire",
};

export default function AdminAssetPartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<AssetPartner | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [partnerResult, contractResult] = await Promise.all([
        supabase.from("vehicle_owners").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("vehicle_exploitation_contracts")
          .select(
            "id,vehicle_id,vehicle_label,monthly_amount_fcfa,start_date,end_date,status,terms_summary,vehicle:vehicles(id,brand,model,plate_number,photo_url)",
          )
          .eq("owner_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (partnerResult.error) throw new Error(partnerResult.error.message);
      if (!partnerResult.data) throw new Error("Partenaire introuvable.");
      if (contractResult.error) throw new Error(contractResult.error.message);
      setPartner(partnerResult.data as AssetPartner);
      setContracts((contractResult.data ?? []) as unknown as Contract[]);
    };
    void load()
      .catch((failure) =>
        setError(failure instanceof Error ? failure.message : "Chargement impossible."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const monthlyCommitment = useMemo(
    () =>
      contracts
        .filter((contract) => contract.status === "active")
        .reduce(
          (sum, contract) => sum + Number(contract.monthly_amount_fcfa || 0),
          0,
        ),
    [contracts],
  );

  if (loading) return <SjCard>Chargement du partenaire…</SjCard>;
  if (!partner) return <SjCard>{error || "Partenaire introuvable."}</SjCard>;

  const name = partner.company_name || partner.full_name;

  return (
    <Entity360Workspace
      entityType="asset_partner"
      entityId={partner.id}
      backHref="/admin/proprietaires"
      eyebrow="Partenaire capital & actifs · vue 360"
      title={name}
      subtitle={partner.notes}
      status={partner.status}
      facts={[
        { label: "Matricule", value: partner.matricule || "—" },
        {
          label: "Nature",
          value: partnerKinds[partner.partner_kind] || partner.partner_kind,
        },
        { label: "Contact", value: partner.full_name },
        { label: "Téléphone", value: partner.phone || "—" },
        { label: "E-mail", value: partner.email || "—" },
        { label: "Adresse", value: partner.address || "—" },
        { label: "Compte extranet", value: partner.user_id ? "Lié" : "Non créé" },
        {
          label: "Engagement",
          value: partner.committed_amount_fcfa
            ? `${Number(partner.committed_amount_fcfa).toLocaleString("fr-FR")} FCFA`
            : "—",
        },
      ]}
      metrics={[
        { label: "Contrats d’actifs", value: contracts.length },
        {
          label: "Contrats actifs",
          value: contracts.filter((contract) => contract.status === "active").length,
        },
        {
          label: "Engagement mensuel",
          value: `${monthlyCommitment.toLocaleString("fr-FR")} F`,
        },
        {
          label: "Véhicules liés",
          value: new Set(contracts.map((contract) => contract.vehicle_id).filter(Boolean))
            .size,
        },
      ]}
      overview={
        <div className="space-y-5">
          <SjCard>
            <h2 className="text-lg font-extrabold">Position dans l’écosystème</h2>
            <p className="sj-muted mt-2 text-sm leading-relaxed">
              Ce partenaire apporte du capital, du financement ou un actif. Il ne
              revend pas les prestations de transport : ce rôle relève des
              prestataires commerciaux.
            </p>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Actifs et contrats d’exploitation</h2>
            <div className="mt-4 space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
                >
                  <div className="sj-between gap-3">
                    <div>
                      {contract.vehicle ? (
                        <Link
                          className="font-bold text-[var(--color-accent)]"
                          href={`/admin/vehicules/${contract.vehicle.id}`}
                        >
                          {contract.vehicle.brand} {contract.vehicle.model}
                        </Link>
                      ) : (
                        <b>{contract.vehicle_label}</b>
                      )}
                      <p className="sj-muted text-sm">
                        {contract.vehicle?.plate_number ||
                          contract.terms_summary ||
                          "Contrat d’exploitation"}
                      </p>
                    </div>
                    <SjBadge tone={contract.status === "active" ? "success" : "info"}>
                      {contract.status}
                    </SjBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <b>
                      {Number(contract.monthly_amount_fcfa).toLocaleString("fr-FR")} FCFA / mois
                    </b>
                    <span className="sj-muted">
                      {contract.start_date
                        ? new Date(contract.start_date).toLocaleDateString("fr-FR")
                        : "Sans date"}{" "}
                      →{" "}
                      {contract.end_date
                        ? new Date(contract.end_date).toLocaleDateString("fr-FR")
                        : "en cours"}
                    </span>
                  </div>
                </div>
              ))}
              {!contracts.length ? (
                <p className="sj-muted text-sm">Aucun actif ou contrat lié.</p>
              ) : null}
            </div>
          </SjCard>
        </div>
      }
    />
  );
}
