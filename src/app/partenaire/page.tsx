"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getPartnerByUserId, type Partner } from "@/lib/partners";
import {
  getActivePartnerContract,
  type PartnerPricingContract,
} from "@/lib/partnerPricing";
import { supabase } from "@/lib/supabase";
import { Search, CalendarCheck, BadgePercent, HelpCircle, X } from "lucide-react";

const ONBOARDING_PARTENAIRE_KEY = "sentrajet_onboarding_partenaire_b2b_done";

export default function PartenaireDashboardPage() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [contract, setContract] = useState<PartnerPricingContract | null>(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowOnboarding(!localStorage.getItem(ONBOARDING_PARTENAIRE_KEY));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getPartnerByUserId(user.id)
      .then(async (p) => {
        setPartner(p ?? null);
        if (!p) return;
        const [c, bookings] = await Promise.all([
          getActivePartnerContract(p.id).catch(() => null),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("partner_id", p.id),
        ]);
        setContract(c);
        setBookingCount(bookings.count ?? 0);
      })
      .catch(() => {});
  }, [user?.id]);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_PARTENAIRE_KEY, "1");
    setShowOnboarding(false);
  };

  const displayName = partner?.company_name?.trim() || "Partenaire";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {showOnboarding && (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-white to-primary-soft/20">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">
                Espace partenaire B2B · SentraJet Premium
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                Réservez des trajets pour votre organisation aux tarifs négociés avec
                SentraJet. La flotte et les chauffeurs sont gérés par la plateforme.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 bg-white/60 p-4 sm:p-6">
            <Button variant="primary" size="sm" href="/recherche">
              <Search className="mr-2 h-4 w-4" /> Réserver un trajet
            </Button>
            <Button variant="ghost" size="sm" onClick={dismissOnboarding}>
              J&apos;ai compris
            </Button>
          </div>
        </Card>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                Bonjour, {displayName}
              </h1>
              <p className="mt-1 text-neutral-600">
                Réservez à vos tarifs partenaires et suivez vos missions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" href="/recherche">
              <Search className="mr-2 h-4 w-4" /> Réserver
            </Button>
            <Button variant="secondary" size="sm" href="/partenaire/reservations">
              <CalendarCheck className="mr-2 h-4 w-4" /> Mes réservations
            </Button>
            <Button variant="ghost" size="sm" href="/partenaire/profil">
              Mon profil
            </Button>
          </div>
        </div>
      </section>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Vue d&apos;ensemble</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card variant="interactive" className="border-neutral-200">
          <Link href="/partenaire/reservations" className="block">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Mes réservations</h3>
                <p className="text-2xl font-bold text-primary">
                  {bookingCount} réservation{bookingCount !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-neutral-500">Au nom de votre structure</p>
              </div>
            </div>
          </Link>
        </Card>

        <Card variant="interactive" className="border-neutral-200">
          <Link href="/partenaire/tarifs" className="block">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <BadgePercent className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Tarifs partenaires</h3>
                <p className="text-2xl font-bold text-neutral-900">
                  {contract
                    ? `−${contract.discount_percent}%`
                    : "Sur devis"}
                </p>
                <p className="text-sm text-neutral-500">
                  {contract?.name || "Aucun contrat actif pour l’instant"}
                </p>
              </div>
            </div>
          </Link>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-base font-semibold text-neutral-900">Comment ça marche</h2>
        <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-neutral-600">
          <li>Recherchez un trajet (départ, destination, date).</li>
          <li>Votre tarif partenaire s’applique selon votre contrat.</li>
          <li>SentraJet assigne un chauffeur de sa flotte à votre réservation.</li>
        </ol>
        <Button variant="primary" size="sm" className="mt-4" href="/recherche">
          Commencer une réservation
        </Button>
      </Card>

      <p className="mt-8 text-center text-sm text-neutral-500">
        <Link href="/contact" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <HelpCircle className="h-4 w-4" /> Aide / Réclamation
        </Link>
      </p>
    </>
  );
}
