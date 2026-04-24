"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { useAuth } from "@/hooks/useAuth";
import { getDriverPublishingReadiness, type DriverPublishingReadiness } from "@/lib/driverReadiness";
import { getDriverTripPublishingState, type DriverTripPublishingState } from "@/lib/tripPublishing";
import { getOpenRequests, type TripRequest } from "@/lib/requests";
import { getBookingsForDriver, type BookingWithTrip } from "@/lib/bookings";
import { MapPin, Calendar, Users, CreditCard, Car, ClipboardList, HelpCircle, History, CheckCircle2, CircleAlert } from "lucide-react";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";

function getInitials(name: string | null, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]![0];
      const b = parts[parts.length - 1]![0];
      if (a && b) return (a + b).toUpperCase();
    }
    if (parts[0]?.length) return parts[0]!.slice(0, 2).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase() || "?";
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function ChauffeurDashboardPage() {
  const { user, profile } = useAuth();
  const [recentRequests, setRecentRequests] = useState<TripRequest[]>([]);
  const [upcomingReservationsCount, setUpcomingReservationsCount] = useState<number>(0);
  const [completedReservationsCount, setCompletedReservationsCount] = useState<number>(0);
  const [showPublishedSuccess, setShowPublishedSuccess] = useState(false);
  const [readiness, setReadiness] = useState<DriverPublishingReadiness | null>(null);
  const [publishingState, setPublishingState] = useState<DriverTripPublishingState | null>(null);

  useEffect(() => {
    getOpenRequests()
      .then((all) => setRecentRequests(all.slice(0, 3)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getBookingsForDriver(user.id)
      .then((list: BookingWithTrip[]) => {
        const now = new Date();
        const upcoming = list.filter((b) => {
          const dep = b.trip?.departure_time;
          if (!dep) return false;
          return new Date(dep) >= now && (b.status === "confirmed" || b.status === "pending");
        });
        setUpcomingReservationsCount(upcoming.length);
        setCompletedReservationsCount(list.filter((b) => b.status === "completed").length);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("published") === "1") {
      setShowPublishedSuccess(true);
      url.searchParams.delete("published");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getDriverPublishingReadiness(user.id)
      .then(setReadiness)
      .catch(() => setReadiness(null));
    getDriverTripPublishingState(user.id)
      .then(setPublishingState)
      .catch(() => setPublishingState(null));
  }, [user?.id]);

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "";
  const firstName = profile?.full_name?.trim()?.split(/\s+/)[0] || displayName;
  const initials = getInitials(profile?.full_name ?? null, user?.email);

  return (
    <>
      {/* Boarding chauffeur : accueil personnalisé */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
                Bonjour, {firstName}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-600">
                Publiez un trajet ou répondez aux demandes des voyageurs.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            href={readiness?.ready ? "/chauffeur/trajet/nouveau" : "/chauffeur/profil"}
            className="shrink-0"
          >
            <Car className="mr-2 h-5 w-5" />
            {readiness?.ready ? "Publier un trajet" : "Compléter mon profil"}
          </Button>
        </div>
        <div className="mt-3">
          <Button variant="ghost" size="sm" href="/chauffeur/demandes">
            Voir les demandes ouvertes
          </Button>
        </div>
      </section>
      {showPublishedSuccess && (
        <FeedbackBanner
          className="mt-4"
          tone="success"
          message="Trajet publié avec succès. Vous pouvez maintenant suivre les réservations."
        />
      )}
      {readiness && (
        <Card className={`mt-4 border ${readiness.ready ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
          <h2 className={`text-sm font-semibold ${readiness.ready ? "text-emerald-900" : "text-amber-900"}`}>
            Conformité publication trajet
          </h2>
          <p className={`mt-1 text-xs ${readiness.ready ? "text-emerald-800" : "text-amber-800"}`}>
            Progression: {Math.round(readiness.completion * 100)}% · Région de référence: {readiness.defaultRegion ?? "à renseigner"}
          </p>
          <div className="mt-2 space-y-1">
            {readiness.steps.map((step) => (
              <p key={step.key} className={`flex items-center gap-2 text-xs ${step.done ? "text-emerald-900" : "text-amber-900"}`}>
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                {step.label}
              </p>
            ))}
          </div>
          {!readiness.ready && (
            <Button size="sm" variant="secondary" href="/chauffeur/profil" className="mt-3">
              Finaliser ma conformité
            </Button>
          )}
        </Card>
      )}
      {publishingState && (
        <Card className="mt-3 border border-sky-200 bg-sky-50/40">
          <h2 className="text-sm font-semibold text-sky-900">Wallet publication</h2>
          <p className="mt-1 text-xs text-sky-800">
            Gratuit restant: {publishingState.freeTripsRemaining}/20 · Solde:{" "}
            {publishingState.walletBalanceCredits} crédit(s) · Découvert restant:{" "}
            {publishingState.loanRemainingTrips} trajet(s)
          </p>
          {!publishingState.canPublish && (
            <Button size="sm" variant="secondary" href="/chauffeur/credits/recharger" className="mt-2">
              Recharger pour republier
            </Button>
          )}
        </Card>
      )}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Mes réservations</h3>
              <p className="text-sm text-neutral-500">
                {upcomingReservationsCount} course{upcomingReservationsCount !== 1 ? "s" : ""} active{upcomingReservationsCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            href="/chauffeur/reservations"
            className="mt-3"
          >
            Voir mes réservations
          </Button>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <Car className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Mes trajets</h3>
              <p className="text-sm text-neutral-500">Publications, résas en attente, confirmées, clôturées</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="secondary" size="sm" href="/chauffeur/trajets" className="w-full">
              Voir mes trajets
            </Button>
            <Button variant="ghost" size="sm" href="/chauffeur/trajet/nouveau" className="w-full">
              Nouveau trajet
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
              <History className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Historique</h3>
              <p className="text-sm text-neutral-500">
                {completedReservationsCount} terminé{completedReservationsCount > 1 ? "es" : "e"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            href="/chauffeur/reservations?tab=history"
            className="mt-3"
          >
            Voir l&apos;historique
          </Button>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Crédits</h3>
              <p className="text-sm text-neutral-500">Rechargez pour publier</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            href="/chauffeur/credits"
            className="mt-3"
          >
            Voir mes crédits
          </Button>
        </Card>
      </div>

      <Card className="mt-3 border border-neutral-200 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-900">Parcours chauffeur recommandé</h2>
        <div className="mt-2 grid gap-2 text-sm text-neutral-600 sm:grid-cols-3">
          <p className="rounded-lg bg-white px-3 py-2">1. Publier un trajet clair (axe + heure + prix)</p>
          <p className="rounded-lg bg-white px-3 py-2">2. Vérifier les demandes ouvertes compatibles</p>
          <p className="rounded-lg bg-white px-3 py-2">3. Suivre vos réservations et crédits chaque jour</p>
        </div>
      </Card>

      {recentRequests.length > 0 && (
        <>
          <div className="mt-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Dernières demandes
            </h2>
            <Link
              href="/chauffeur/demandes"
              className="text-sm font-medium text-primary hover:underline"
            >
              Tout voir
            </Link>
          </div>
          <div className="mt-2.5 space-y-2.5">
            {recentRequests.map((req) => (
              <Card key={req.id} variant="interactive">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {req.from_city} → {req.to_city}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(req.departure_date).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short" }
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {req.passengers}p
                      </span>
                      <TripTypeBadge tripType={req.trip_type} />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    href={`/chauffeur/demandes?requestId=${encodeURIComponent(req.id)}&from=${encodeURIComponent(req.from_city)}&to=${encodeURIComponent(req.to_city)}&type=${encodeURIComponent(req.trip_type)}`}
                  >
                    <MapPin className="mr-1 h-3.5 w-3.5" /> Répondre
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      {recentRequests.length === 0 && (
        <Card className="mt-5 border border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">Aucune demande ouverte actuellement</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Publiez un trajet maintenant pour être visible dès qu&apos;une nouvelle demande apparaît.
          </p>
          <Button className="mt-3" size="sm" href="/chauffeur/trajet/nouveau">
            Publier un trajet
          </Button>
        </Card>
      )}

      <p className="mt-5 text-center text-sm text-neutral-500">
        <Link href="/contact" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <HelpCircle className="h-4 w-4" /> Aide / Réclamation
        </Link>
      </p>
    </>
  );
}
