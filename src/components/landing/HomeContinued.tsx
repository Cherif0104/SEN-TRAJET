import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  MapPin,
  Radio,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const trust = [
  "Chauffeurs identifiés",
  "Mobile Money (Wave, OM…)",
  "Suivi trajet en direct",
  "Prix affichés avant réservation",
];

const pillars = [
  {
    icon: Search,
    title: "Recherche instantanée",
    text: "Trajets publiés ou demande personnalisée : vous choisissez le mode qui vous arrange.",
  },
  {
    icon: BadgeCheck,
    title: "Profils & véhicules",
    text: "Documents, catégories de véhicule et avis : des critères clairs pour décider vite.",
  },
  {
    icon: Banknote,
    title: "Paiement local",
    text: "Crédits chauffeur et flux pensés pour le contexte sénégalais, sans friction inutile.",
  },
];

const steps = [
  {
    n: "1",
    title: "Indiquez départ & arrivée",
    desc: "Depuis l’accueil ou la page recherche : date, heure, et budget max si besoin.",
  },
  { n: "2", title: "Comparez & réservez", desc: "Trajet publié ou demande avec propositions des chauffeurs." },
  { n: "3", title: "Roulez, puis notez", desc: "Messagerie liée à la réservation et avis après le trajet." },
];

const routes = [
  { from: "Dakar", to: "Thiès" },
  { from: "Dakar", to: "Saint-Louis" },
  { from: "Dakar", to: "Mbour" },
  { from: "Thiès", to: "Dakar" },
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
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              Avantages
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Une plateforme taillée pour l’interurbain
            </h2>
            <p className="mt-3 text-neutral-600">
              Moins de blabla, plus d’actions : tout est pensé pour décider vite et voyager sereinement.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
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
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Parcours
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
                Trois étapes, un seul objectif
              </h2>
            </div>
            <Button variant="outline" size="sm" href="/comment-ca-marche" className="w-fit shrink-0">
              En savoir plus
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
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
              Trajets souvent recherchés
            </h2>
            <Link
              href="/recherche"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Toute la recherche →
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {routes.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/recherche?depart=${encodeURIComponent(route.from)}&destination=${encodeURIComponent(route.to)}`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-emerald-500/40 hover:bg-emerald-50/50"
              >
                <MapPin className="h-4 w-4 text-emerald-600" />
                {route.from} → {route.to}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-900 py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:px-8 lg:gap-16">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Offre
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Vous roulez professionnellement ?
            </h2>
            <p className="mt-3 text-neutral-400">
              Publiez vos trajets, gérez vos crédits et développez votre activité avec des outils simples.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="lg"
                href="/inscription?role=chauffeur"
                className="bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Créer un compte chauffeur
              </Button>
              <Button variant="secondary" size="lg" href="/partenaire/onboarding" className="border-white/30 text-white hover:bg-white/10">
                Espace partenaire
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
            <Radio className="h-8 w-8 text-emerald-400" />
            <p className="mt-4 text-lg font-semibold">Mise en relation en temps réel</p>
            <p className="mt-2 text-sm text-neutral-400">
              Demandes, propositions, notifications : restez synchronisé avec vos clients sans quitter la plateforme.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
