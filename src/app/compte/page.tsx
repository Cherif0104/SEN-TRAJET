"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsForClient } from "@/lib/bookings";
import { getMyRequests } from "@/lib/requests";
import { CalendarCheck, MessageCircle, Route, Package, Car, X } from "lucide-react";

const ONBOARDING_STORAGE_KEY = "sentrajet_onboarding_client_done";

const onboardingActions = [
  { icon: Route, label: "Demander une course", href: "/recherche", description: "Trouvez un trajet interurbain rapidement" },
  { icon: Package, label: "Envoyer un colis", href: "/demande?tripType=colis", description: "Expédiez un colis entre régions" },
  { icon: Car, label: "Louer une voiture", href: "/location", description: "Accédez aux véhicules disponibles" },
];

function getInitials(name: string | null, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function ComptePage() {
  const { user, profile } = useAuth();
  const [nextBookingsCount, setNextBookingsCount] = useState(0);
  const [openRequestsCount, setOpenRequestsCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    setShowOnboarding(!done);
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    getBookingsForClient(user.id).then((list) => {
      const now = new Date();
      const upcoming = list.filter((b) => b.status !== "cancelled" && new Date((b.trip as { departure_time: string })?.departure_time ?? 0) >= now);
      setNextBookingsCount(upcoming.length);
    });
    getMyRequests(user.id).then((list) => {
      setOpenRequestsCount(list.filter((r) => r.status === "open").length);
    });
  }, [user?.id]);

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "vous";
  const firstName = profile?.full_name?.trim()?.split(/\s+/)[0] || displayName;
  const initials = getInitials(profile?.full_name ?? null, user?.email);

  return (
    <>
      {/* Onboarding client : première visite */}
      {showOnboarding && (
        <Card className="mb-6 overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-white to-primary-soft/30">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
                Bienvenue sur SEN TRAJET
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Choisissez ce que vous voulez faire. Tout est ici.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 bg-white/60 p-4 sm:grid-cols-4 sm:p-6">
            {onboardingActions.map(({ icon: Icon, label, href, description }) => (
              <Link
                key={href + label}
                href={href}
                onClick={dismissOnboarding}
                className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-neutral-900">{label}</span>
                <span className="text-xs text-neutral-500">{description}</span>
              </Link>
            ))}
          </div>
          <div className="border-t border-neutral-200 bg-white/80 px-4 py-3 text-right sm:px-6">
            <Button variant="primary" size="sm" onClick={dismissOnboarding}>
              C&apos;est parti
            </Button>
          </div>
        </Card>
      )}

      {/* Boarding client : accueil personnalisé */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                Bonjour, {firstName}
              </h1>
              <p className="mt-1 text-neutral-600">Choisissez un service et continuez.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/recherche"
            className="group rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Route className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-900">Je voyage</h3>
            <p className="mt-1 text-sm text-neutral-600">Réserver un trajet.</p>
            <span className="mt-3 inline-block text-sm font-semibold text-emerald-700 group-hover:underline">
              Ouvrir
            </span>
          </Link>

          <Link
            href="/demande?tripType=colis"
            className="group rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition hover:border-amber-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-900">Envoyer un colis</h3>
            <p className="mt-1 text-sm text-neutral-600">Créer une demande.</p>
            <span className="mt-3 inline-block text-sm font-semibold text-amber-700 group-hover:underline">
              Ouvrir
            </span>
          </Link>

          <Link
            href="/location"
            className="group rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm transition hover:border-sky-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Car className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-900">Louer une voiture</h3>
            <p className="mt-1 text-sm text-neutral-600">Voir les véhicules.</p>
            <span className="mt-3 inline-block text-sm font-semibold text-sky-700 group-hover:underline">Ouvrir</span>
          </Link>
        </div>
      </section>

      {/* Accès rapides */}
      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Accès rapides</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <CalendarCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Mes réservations</h3>
              <p className="text-sm text-neutral-500">
                {nextBookingsCount} réservation{nextBookingsCount !== 1 ? "s" : ""} à venir
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" href="/compte/reservations" className="mt-3">
            Voir la liste
          </Button>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Mes demandes</h3>
              <p className="text-sm text-neutral-500">
                {openRequestsCount} demande{openRequestsCount !== 1 ? "s" : ""} ouverte{openRequestsCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" href="/compte/demandes" className="mt-3">
            Voir mes demandes
          </Button>
        </Card>
      </div>

      <p className="mt-6 text-sm text-neutral-500">
        <Link href="/messages" className="font-medium text-primary hover:underline">
          Voir mes messages
        </Link>
        {" · "}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          Aide / Réclamation
        </Link>
      </p>
    </>
  );
}
