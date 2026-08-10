import Link from "next/link";
import { BadgeCheck, Banknote, MapPin, Plane, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

const trust = [
  "Flotte SentraJet Premium",
  "Devis & paiement Wave",
  "Suivi WhatsApp + plateforme",
  "Tarifs clairs avant réservation",
];

const pillars = [
  {
    icon: Plane,
    title: "Transfert aéroport",
    text: "Forfaits AIBD selon le nombre de passagers. Position reprise, prix affiché immédiatement.",
  },
  {
    icon: MapPin,
    title: "Voyage interurbain",
    text: "Facturation au kilomètre (850 F client). Minimum clair, aller-retour possible.",
  },
  {
    icon: Clock,
    title: "Mise à disposition",
    text: "Matinée à 50 000 F jusqu’à 100 km, puis 700 F/km. SentraJet assigne le véhicule.",
  },
];

const steps = [
  {
    n: "1",
    title: "Simulez votre trajet",
    desc: "Choisissez aéroport, voyage ou mise à disposition. Estimation tarif client en ligne.",
  },
  {
    n: "2",
    title: "Envoyez votre demande",
    desc: "SentraJet valide, confirme le devis et vous envoie le lien de paiement Wave.",
  },
  {
    n: "3",
    title: "Le jour J, on arrive",
    desc: "Un véhicule de la flotte vous est assigné. Suivi sur la plateforme ou WhatsApp.",
  },
];

const routes = [
  { from: "Dakar", to: "AIBD", service: "transfert_aibd" },
  { from: "Dakar", to: "Thiès", service: "interurbain" },
  { from: "Dakar", to: "Mbour", service: "interurbain" },
  { from: "Dakar", to: "Saly", service: "interurbain" },
  { from: "Dakar", to: "Saint-Louis", service: "interurbain" },
  { from: "Dakar", to: "Kaolack", service: "interurbain" },
];

export function HomeContinued() {
  return (
    <>
      <section className="border-b border-neutral-200/80 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-center sm:px-6 lg:px-8">
          {trust.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">Services</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Une réservation simple, traitée par SentraJet
            </h2>
            <p className="mt-3 text-neutral-600">
              Plus de matching chauffeur. Vous réservez ; l’entreprise valide, facture et envoie le
              véhicule.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">Parcours</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
                Trois étapes, zéro friction
              </h2>
            </div>
            <Button variant="outline" size="sm" href="/reserver" className="w-fit shrink-0">
              Simuler un tarif
            </Button>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="relative flex gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white"
                  aria-hidden
                >
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold text-neutral-900">{s.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-neutral-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Destinations fréquentes</h2>
            <Link href="/reserver" className="text-sm font-semibold text-amber-800 hover:text-amber-900">
              Réserver →
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {routes.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/reserver?service=${route.service}&depart=${encodeURIComponent(route.from)}&destination=${encodeURIComponent(route.to)}`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-amber-500/40 hover:bg-amber-50/50"
              >
                <MapPin className="h-4 w-4 text-amber-700" />
                {route.from} → {route.to}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-900 py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:px-8 lg:gap-16">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              Compte client
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              −10 % en créant un compte
            </h2>
            <p className="mt-3 text-neutral-400">
              Simulation libre au tarif client. Avec un compte, la remise s’applique automatiquement.
              Les tarifs partenaires restent réservés à l’espace B2B.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="lg"
                href="/inscription"
                className="bg-amber-500 text-neutral-900 hover:bg-amber-400 focus:ring-amber-500"
              >
                Créer un compte
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/partenaire/onboarding"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Espace partenaire B2B
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
            <Car className="h-8 w-8 text-amber-400" />
            <p className="mt-4 text-lg font-semibold">Flotte entreprise, pas marketplace</p>
            <p className="mt-2 text-sm text-neutral-400">
              SentraJet assigne chauffeurs et véhicules, gère les conflits de planning, envoie les
              factures et suit chaque prestation jusqu’à la fin.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-300">
              <Banknote className="h-4 w-4 text-amber-400" />
              Paiement Wave sécurisé
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
