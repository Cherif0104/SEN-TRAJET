import Link from "next/link";
import { MapPin, Plane, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

const pillars = [
  {
    icon: Plane,
    title: "Transfert aéroport",
    text: "AIBD — forfaits dès 20 000 FCFA selon les passagers.",
  },
  {
    icon: MapPin,
    title: "Voyager",
    text: "Course & interurbain au kilomètre réel.",
  },
  {
    icon: Clock,
    title: "Mise à disposition",
    text: "50 000 FCFA / 10 h à Dakar, puis au km.",
  },
];

const steps = [
  { n: "1", title: "Simulez", desc: "Adresses, date, tarif estimé." },
  { n: "2", title: "Confirmez", desc: "SentraJet valide et envoie le paiement Wave." },
  { n: "3", title: "Roulez", desc: "Véhicule de la flotte assigné le jour J." },
];

export function HomeContinued() {
  return (
    <>
      <section className="bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">Services</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Trois prestations, une flotte
            </h2>
            <p className="mt-3 text-neutral-600">
              Vous réservez. SentraJet organise, facture et envoie le véhicule.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <Link
                key={title}
                href="/reserver"
                className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p>
              </Link>
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
                Simulez → payez → on arrive
              </h2>
            </div>
            <Button variant="outline" size="sm" href="/reserver" className="w-fit shrink-0">
              Réserver
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

      <section className="bg-[#07111f] py-14 text-white sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Prêt à partir ?</h2>
            <p className="mt-2 max-w-lg text-neutral-400">
              Estimation en ligne, paiement Wave, −10 % avec un compte.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              href="/reserver"
              className="bg-amber-500 text-neutral-900 hover:bg-amber-400 focus:ring-amber-500"
            >
              Réserver
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href="/inscription"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Créer un compte
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
