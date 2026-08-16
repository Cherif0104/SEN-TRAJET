"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Entity360Workspace } from "@/components/admin/Entity360Workspace";
import { SjBadge, SjCard } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";
import type { PlatformDriver, PlatformVehicle } from "@/lib/platformOps";

type AssignmentRow = {
  id: string;
  assigned_at: string;
  driver: { id: string; full_name: string } | null;
  service_order: {
    order_number: string;
    status: string;
    booking: {
      reference: string | null;
      pickup: string;
      dropoff: string;
      pickup_time: string;
    } | null;
  } | null;
};

type ExploitationContract = {
  id: string;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  terms_summary: string | null;
  owner: {
    id: string;
    full_name: string;
    company_name: string | null;
    partner_kind: string;
  } | null;
};

export default function AdminVehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<PlatformVehicle | null>(null);
  const [driver, setDriver] = useState<PlatformDriver | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [contracts, setContracts] = useState<ExploitationContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [vehicleResult, assignmentResult, contractResult] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("dispatch_assignments")
          .select(
            "id,assigned_at,driver:drivers(id,full_name),service_order:service_orders(order_number,status,booking:bookings(reference,pickup,dropoff,pickup_time))",
          )
          .eq("vehicle_id", id)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("vehicle_exploitation_contracts")
          .select(
            "id,vehicle_label,monthly_amount_fcfa,start_date,end_date,status,terms_summary,owner:vehicle_owners(id,full_name,company_name,partner_kind)",
          )
          .eq("vehicle_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (vehicleResult.error) throw new Error(vehicleResult.error.message);
      if (!vehicleResult.data) throw new Error("Véhicule introuvable.");
      if (assignmentResult.error) throw new Error(assignmentResult.error.message);
      if (contractResult.error) throw new Error(contractResult.error.message);
      const row = vehicleResult.data as PlatformVehicle;
      setVehicle(row);
      setAssignments((assignmentResult.data ?? []) as unknown as AssignmentRow[]);
      setContracts((contractResult.data ?? []) as unknown as ExploitationContract[]);
      if (row.driver_id) {
        const driverResult = await supabase
          .from("drivers")
          .select("*")
          .eq("id", row.driver_id)
          .maybeSingle();
        if (!driverResult.error && driverResult.data) {
          setDriver(driverResult.data as PlatformDriver);
        }
      }
    };
    void load()
      .catch((failure) =>
        setError(failure instanceof Error ? failure.message : "Chargement impossible."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SjCard>Chargement du véhicule…</SjCard>;
  if (!vehicle) return <SjCard>{error || "Véhicule introuvable."}</SjCard>;

  const label = `${vehicle.brand} ${vehicle.model}`;

  return (
    <Entity360Workspace
      entityType="vehicle"
      entityId={vehicle.id}
      backHref="/admin/vehicules"
      eyebrow="Véhicule · cycle de vie complet"
      title={label}
      subtitle={vehicle.notes}
      imageUrl={vehicle.photo_url}
      status={vehicle.status}
      facts={[
        { label: "Immatriculation", value: vehicle.plate_number },
        { label: "Catégorie", value: vehicle.category },
        { label: "Année", value: vehicle.year || "—" },
        { label: "Couleur", value: vehicle.color || "—" },
        { label: "Places", value: vehicle.seats || "—" },
        { label: "Classe de service", value: vehicle.service_class || "—" },
        { label: "Climatisation", value: vehicle.air_conditioning ? "Oui" : "Non" },
        { label: "Vérification", value: vehicle.is_verified ? "Validé" : "À vérifier" },
      ]}
      metrics={[
        { label: "Missions", value: assignments.length },
        {
          label: "Terminées",
          value: assignments.filter(
            (item) => item.service_order?.status === "completed",
          ).length,
        },
        { label: "Contrats d’exploitation", value: contracts.length },
        {
          label: "Loyer mensuel",
          value: contracts
            .filter((item) => item.status === "active")
            .reduce((sum, item) => sum + Number(item.monthly_amount_fcfa), 0)
            .toLocaleString("fr-FR"),
          detail: "FCFA · contrats actifs",
        },
      ]}
      overview={
        <div className="space-y-5">
          <SjCard>
            <h2 className="text-lg font-extrabold">Affectation et partenaire d’actif</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                <div className="sj-muted text-xs font-bold uppercase">Chauffeur</div>
                {driver ? (
                  <Link
                    href={`/admin/chauffeurs/${driver.id}`}
                    className="mt-1 block font-bold text-[var(--color-accent)]"
                  >
                    {driver.full_name}
                  </Link>
                ) : (
                  <b className="mt-1 block">Non affecté</b>
                )}
              </div>
              <div className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                <div className="sj-muted text-xs font-bold uppercase">
                  Partenaire / propriétaire
                </div>
                {contracts[0]?.owner ? (
                  <Link
                    href={`/admin/proprietaires/${contracts[0].owner.id}`}
                    className="mt-1 block font-bold text-[var(--color-accent)]"
                  >
                    {contracts[0].owner.company_name ||
                      contracts[0].owner.full_name}
                  </Link>
                ) : (
                  <b className="mt-1 block">Actif SentraJet</b>
                )}
              </div>
            </div>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Contrats d’exploitation</h2>
            <div className="mt-4 space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
                >
                  <div className="sj-between gap-3">
                    <div>
                      <b>
                        {contract.owner?.company_name ||
                          contract.owner?.full_name ||
                          "Partenaire"}
                      </b>
                      <p className="sj-muted text-sm">{contract.terms_summary || "Exploitation"}</p>
                    </div>
                    <SjBadge tone={contract.status === "active" ? "success" : "info"}>
                      {contract.status}
                    </SjBadge>
                  </div>
                  <p className="mt-2 text-sm font-bold">
                    {Number(contract.monthly_amount_fcfa).toLocaleString("fr-FR")} FCFA / mois
                  </p>
                </div>
              ))}
            </div>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Dernières missions</h2>
            <div className="mt-4 space-y-3">
              {assignments.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
                >
                  <div className="sj-between gap-3">
                    <b>{item.service_order?.order_number || "Mission"}</b>
                    <SjBadge tone="info">
                      {item.service_order?.status || "assignée"}
                    </SjBadge>
                  </div>
                  <p className="sj-muted mt-1 text-sm">
                    {item.service_order?.booking
                      ? `${item.service_order.booking.pickup} → ${item.service_order.booking.dropoff}`
                      : "Réservation non disponible"}
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
