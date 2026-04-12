"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  getPartnerByUserId,
  getPartnerDrivers,
  getPartnerCommissions,
  type Partner,
} from "@/lib/partners";
import { Users, Coins, Copy, Check, Share2, UserPlus, X, HelpCircle, Car } from "lucide-react";

const ONBOARDING_PARTENAIRE_KEY = "sentrajet_onboarding_partenaire_done";

export default function PartenaireDashboardPage() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [driverCount, setDriverCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowOnboarding(!localStorage.getItem(ONBOARDING_PARTENAIRE_KEY));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getPartnerByUserId(user.id)
      .then((p) => {
        setPartner(p ?? null);
        if (p) {
          getPartnerDrivers(p.id).then((d) => setDriverCount(d.length));
          getPartnerCommissions(p.id, { status: "pending" }).then((c) =>
            setPendingTotal(c.reduce((s, x) => s + x.amount_fcfa, 0))
          );
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const inviteUrl =
    typeof window !== "undefined" && partner
      ? `${window.location.origin}/inscription?invite=${partner.invite_code}`
      : "";

  const copyInviteLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_PARTENAIRE_KEY, "1");
    setShowOnboarding(false);
  };

  const displayName = partner?.company_name?.trim() || "Partenaire";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Onboarding première visite */}
      {showOnboarding && (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-white to-primary-soft/20">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Bienvenue dans l&apos;espace partenaire</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Partagez votre lien d&apos;invitation aux chauffeurs. Lorsqu&apos;ils s&apos;inscrivent avec ce lien,
                ils sont rattachés à votre structure et vous percevez des commissions sur leurs recharges de crédits
                et les trajets réalisés.
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
            <Button variant="primary" size="sm" onClick={copyInviteLink} disabled={!inviteUrl}>
              <Share2 className="mr-2 h-4 w-4" /> Partager le lien
            </Button>
            <Button variant="ghost" size="sm" onClick={dismissOnboarding}>
              J&apos;ai compris
            </Button>
          </div>
        </Card>
      )}

      {/* Accueil */}
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
                Gérez vos chauffeurs et suivez vos commissions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" href="/partenaire/chauffeurs">
              <Users className="mr-2 h-4 w-4" /> Mes chauffeurs
            </Button>
            <Button variant="secondary" size="sm" href="/partenaire/commissions">
              <Coins className="mr-2 h-4 w-4" /> Commissions
            </Button>
            <Button variant="secondary" size="sm" href="/partenaire/location/vehicules">
              <Car className="mr-2 h-4 w-4" /> Flotte location
            </Button>
            <Button variant="ghost" size="sm" href="/partenaire/profil">
              Mon profil
            </Button>
          </div>
        </div>
      </section>

      {/* Lien d'invitation — bloc principal */}
      <Card className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <UserPlus className="h-5 w-5 text-primary" />
              Votre lien d&apos;invitation
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Envoyez ce lien aux chauffeurs que vous souhaitez recruter. Ils s&apos;inscriront en tant que chauffeur
              et seront automatiquement rattachés à votre compte partenaire.
            </p>
            <p className="mt-2 font-mono text-xs text-neutral-700 break-all sm:text-sm">
              {inviteUrl || "Chargement…"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={copyInviteLink}
              disabled={!inviteUrl}
            >
              {inviteCopied ? (
                <><Check className="mr-2 h-4 w-4" /> Copié</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> Copier le lien</>
              )}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((h) => !h)}
          className="mt-4 flex items-center gap-2 text-xs font-medium text-primary hover:underline"
        >
          <HelpCircle className="h-4 w-4" />
          {showHelp ? "Masquer" : "Comment ça marche ?"}
        </button>
        {showHelp && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            <ol className="list-inside list-decimal space-y-1">
              <li>Copiez le lien et partagez-le (SMS, WhatsApp, email).</li>
              <li>Le chauffeur clique sur le lien et choisit « Chauffeur » à l&apos;inscription.</li>
              <li>Il apparaît dans « Mes chauffeurs » et ses recharges / trajets génèrent vos commissions.</li>
            </ol>
          </div>
        )}
      </Card>

      {/* Chiffres clés */}
      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Vue d&apos;ensemble</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card variant="interactive" className="border-neutral-200">
          <Link href="/partenaire/chauffeurs" className="block">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Mes chauffeurs</h3>
                <p className="text-2xl font-bold text-primary">
                  {driverCount} chauffeur{driverCount !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-neutral-500">Rattachés à votre structure</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="mt-4 w-full sm:w-auto">
              Voir la liste
            </Button>
          </Link>
        </Card>

        <Card variant="interactive" className="border-neutral-200">
          <Link href="/partenaire/commissions" className="block">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <Coins className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Commissions en attente</h3>
                <p className="text-2xl font-bold text-neutral-900">
                  {pendingTotal.toLocaleString("fr-FR")} FCFA
                </p>
                <p className="text-sm text-neutral-500">Sur recharges et trajets</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="mt-4 w-full sm:w-auto">
              Voir le détail
            </Button>
          </Link>
        </Card>
      </div>

      {driverCount === 0 && (
        <Card className="mt-6 border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-8 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-3 font-medium text-neutral-700">Aucun chauffeur pour l&apos;instant</p>
          <p className="mt-1 text-sm text-neutral-500">
            Copiez votre lien d&apos;invitation ci-dessus et partagez-le pour recruter vos premiers chauffeurs.
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={copyInviteLink} disabled={!inviteUrl}>
            <Copy className="mr-2 h-4 w-4" /> Copier le lien
          </Button>
        </Card>
      )}

      <p className="mt-8 text-center text-sm text-neutral-500">
        <Link href="/contact" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <HelpCircle className="h-4 w-4" /> Aide / Réclamation
        </Link>
      </p>
    </>
  );
}
