"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BusFront, CalendarDays, CarFront, Navigation, Route, UserRound } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { useClientTrips } from "@/hooks/useClientTrips";
import type { ClientTrip, ClientTripKind } from "@/lib/clientTrips";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "a_venir" | "passees" | "annulees";

const KIND_ICON: Record<ClientTripKind, typeof Navigation> = {
  platform: Navigation,
  allo_dakar: Route,
  allo_dakar_request: Route,
  voyager: BusFront,
  rental: CarFront,
  my_driver: UserRound,
};

function tripTone(trip: ClientTrip): "success" | "warning" | "info" | "danger" {
  if (trip.lifecycle === "cancelled") return "danger";
  if (trip.lifecycle === "past") return "success";
  if (["confirmee", "confirmed", "chauffeur_assigne", "chauffeur_accepte"].includes(trip.status)) {
    return "success";
  }
  return ["recherche", "recherche_chauffeur", "ouverte", "pending_payment"].includes(trip.status)
    ? "warning"
    : "info";
}

export default function CompteReservationsPage() {
  const { rows, loading, error } = useClientTrips();
  const [tab, setTab] = useState<Tab>("a_venir");

  const filtered = rows.filter((trip) => {
    if (tab === "passees") return trip.lifecycle === "past";
    if (tab === "annulees") return trip.lifecycle === "cancelled";
    return trip.lifecycle === "upcoming";
  });

  return (
    <>
      <SjSectionHead
        title="Mes trajets"
        action={
          <Link href="/course" className="sj-btn sj-btn-primary">
            + Nouveau trajet
          </Link>
        }
      />
      <p className="mb-4 text-sm text-slate-500">
        Toutes vos courses, locations, navettes et missions au même endroit.
      </p>
      <div className="sj-tabs" style={{ marginBottom: 16 }}>
        {(
          [
            ["a_venir", "À venir", rows.filter((trip) => trip.lifecycle === "upcoming").length],
            ["passees", "Passés", rows.filter((trip) => trip.lifecycle === "past").length],
            ["annulees", "Annulés", rows.filter((trip) => trip.lifecycle === "cancelled").length],
          ] as [Tab, string, number][]
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "sj-btn sj-btn-primary" : "sj-btn"}
            onClick={() => setTab(value)}
          >
            {label} ({count})
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((trip) => {
            const Icon = KIND_ICON[trip.kind];
            return (
            <Link key={`${trip.kind}:${trip.id}`} href={trip.detailHref}>
              <SjCard>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                        {trip.serviceLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {trip.reference}
                      </span>
                    </div>
                    <b className="mt-1 block text-sm leading-5 text-slate-950">{trip.title}</b>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(trip.startsAt).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                    {trip.subtitle ? (
                      <p className="mt-1 truncate text-xs text-slate-500">{trip.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <SjBadge tone={tripTone(trip)}>{trip.statusLabel}</SjBadge>
                    <div className="sj-gold mt-2 text-sm font-black">
                      {trip.amountFcfa != null ? formatFcfa(trip.amountFcfa) : "—"}
                    </div>
                    <ArrowRight className="ml-auto mt-2 h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </SjCard>
            </Link>
            );
          })}
          {!filtered.length ? (
            <SjCard>
              <p className="sj-muted">Aucun trajet dans cette catégorie.</p>
            </SjCard>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
