"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Entity360Workspace } from "@/components/admin/Entity360Workspace";
import { SjBadge, SjCard } from "@/components/sentrajet/PremiumShell";
import { getDriverDocumentUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { PlatformDriver, PlatformVehicle } from "@/lib/platformOps";

type AssignmentRow = {
  id: string;
  assigned_at: string;
  vehicle: { brand: string; model: string; plate_number: string } | null;
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

export default function AdminDriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [driver, setDriver] = useState<PlatformDriver | null>(null);
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [driverResult, vehicleResult, assignmentResult] = await Promise.all([
        supabase.from("drivers").select("*").eq("id", id).maybeSingle(),
        supabase.from("vehicles").select("*").eq("driver_id", id),
        supabase
          .from("dispatch_assignments")
          .select(
            "id,assigned_at,vehicle:vehicles(brand,model,plate_number),service_order:service_orders(order_number,status,booking:bookings(reference,pickup,dropoff,pickup_time))",
          )
          .eq("driver_id", id)
          .order("assigned_at", { ascending: false }),
      ]);
      if (driverResult.error) throw new Error(driverResult.error.message);
      if (!driverResult.data) throw new Error("Chauffeur introuvable.");
      if (vehicleResult.error) throw new Error(vehicleResult.error.message);
      if (assignmentResult.error) throw new Error(assignmentResult.error.message);
      setDriver(driverResult.data as PlatformDriver);
      setVehicles((vehicleResult.data ?? []) as PlatformVehicle[]);
      setAssignments((assignmentResult.data ?? []) as unknown as AssignmentRow[]);
    };
    void load()
      .catch((failure) =>
        setError(failure instanceof Error ? failure.message : "Chargement impossible."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SjCard>Chargement du chauffeur…</SjCard>;
  if (!driver) return <SjCard>{error || "Chauffeur introuvable."}</SjCard>;

  return (
    <Entity360Workspace
      entityType="driver"
      entityId={driver.id}
      backHref="/admin/chauffeurs"
      eyebrow="Chauffeur · dossier professionnel"
      title={driver.full_name}
      subtitle={driver.notes}
      imageUrl={driver.photo_url}
      status={driver.status}
      facts={[
        { label: "Téléphone", value: driver.phone || "—" },
        { label: "E-mail", value: driver.email || "—" },
        { label: "Permis", value: driver.license_number || "Non renseigné" },
        {
          label: "Expiration permis",
          value: driver.license_expiry_date
            ? new Date(driver.license_expiry_date).toLocaleDateString("fr-FR")
            : "—",
        },
        { label: "Adresse", value: driver.address || "—" },
        { label: "Urgence", value: driver.emergency_contact || "—" },
        { label: "Compte", value: driver.user_id ? "Lié" : "Non créé" },
        {
          label: "Permis numérisé",
          value: driver.license_photo_url ? (
            <button
              className="font-bold text-[var(--color-accent)] underline"
              type="button"
              onClick={() =>
                void getDriverDocumentUrl(driver.license_photo_url!).then((url) =>
                  window.open(url, "_blank", "noopener,noreferrer"),
                )
              }
            >
              Ouvrir
            </button>
          ) : (
            "Manquant"
          ),
        },
      ]}
      metrics={[
        { label: "Missions", value: assignments.length },
        {
          label: "Terminées",
          value: assignments.filter(
            (item) => item.service_order?.status === "completed",
          ).length,
        },
        { label: "Véhicules affectés", value: vehicles.length },
        {
          label: "Conformité permis",
          value:
            driver.license_number && driver.license_photo_url ? "Complet" : "À compléter",
        },
      ]}
      overview={
        <div className="space-y-5">
          <SjCard>
            <h2 className="text-lg font-extrabold">Véhicules actuellement affectés</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-xl bg-[var(--color-surface-secondary)] p-3"
                >
                  <b>
                    {vehicle.brand} {vehicle.model}
                  </b>
                  <div className="sj-muted text-sm">{vehicle.plate_number}</div>
                </div>
              ))}
              {!vehicles.length ? (
                <p className="sj-muted text-sm">Aucun véhicule affecté.</p>
              ) : null}
            </div>
          </SjCard>
          <SjCard>
            <h2 className="text-lg font-extrabold">Historique des missions</h2>
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
                  <p className="sj-muted mt-1 text-xs">
                    {item.vehicle
                      ? `${item.vehicle.brand} ${item.vehicle.model} · ${item.vehicle.plate_number}`
                      : "Véhicule non disponible"}
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
