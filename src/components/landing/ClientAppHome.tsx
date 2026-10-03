"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Clock3,
  Home,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  Plane,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/geocode";
import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/components/booking/AddressAutocomplete";

const LOCATION_PRIMER_KEY = "sentrajet_location_primer_v1";

const services = [
  {
    title: "Allo Dakar",
    detail: "Voyager à la place",
    href: "/allo-dakar",
    icon: UsersRound,
    image: "/hero-landing.png",
    imagePosition: "48% center",
    tone: "from-emerald-900/5 to-emerald-950/85",
    layout: "col-span-2 row-span-2",
  },
  {
    title: "Taxi AIBD",
    detail: "Trouver un chauffeur",
    href: "/taxi-aeroport",
    icon: Plane,
    image: "/images/hero-sen-trajet.png",
    imagePosition: "72% center",
    tone: "from-[#07111f]/10 to-[#07111f]/80",
    layout: "col-span-1 row-span-1",
  },
  {
    title: "Louer une voiture",
    detail: "Voir le catalogue",
    href: "/flotte",
    icon: CarFront,
    image: "/brand/sentrajet-vehicle-hero.webp",
    imagePosition: "50% center",
    tone: "from-[#07111f]/5 to-[#07111f]/85",
    layout: "col-span-1 row-span-1",
  },
  {
    title: "Premium",
    detail: "Chauffeur à disposition",
    href: "/reserver?service=mise_a_disposition",
    icon: Sparkles,
    image: "/images/hero-sen-trajet.png",
    imagePosition: "20% center",
    tone: "from-amber-900/5 to-[#07111f]/85",
    layout: "col-span-3 row-span-1",
  },
];

const suggestions = [
  {
    title: "Aéroport AIBD",
    detail: "Diass · taxi en direct",
    href: "/taxi-aeroport",
    icon: Plane,
  },
  {
    title: "Dakar Plateau",
    detail: "Centre-ville · trajet professionnel",
    href: "/reserver?destination=Dakar%20Plateau",
    icon: MapPin,
  },
  {
    title: "Une journée avec chauffeur",
    detail: "8 h à Dakar · dès 50 000 F",
    href: "/reserver?service=mise_a_disposition",
    icon: Clock3,
  },
];

export function ClientAppHome() {
  const router = useRouter();
  const { position, error: locationError, loading: locating, getPosition } = useGeolocation({
    enableHighAccuracy: false,
    timeout: 8_000,
  });
  const [destination, setDestination] = useState("");
  const [destinationPlace, setDestinationPlace] = useState<SelectedPlace | null>(null);
  const [locationLabel, setLocationLabel] = useState("Votre position");
  const [showLocationPrimer, setShowLocationPrimer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      setShowLocationPrimer(window.localStorage.getItem(LOCATION_PRIMER_KEY) !== "seen");
    } catch {
      setShowLocationPrimer(false);
    }
  }, []);

  useEffect(() => {
    if (!position) return;
    let cancelled = false;
    void reverseGeocode(position.lat, position.lng).then((label) => {
      if (!cancelled && label) setLocationLabel(label);
    });
    return () => {
      cancelled = true;
    };
  }, [position]);

  function rememberLocationPrimer() {
    try {
      window.localStorage.setItem(LOCATION_PRIMER_KEY, "seen");
    } catch {
      // L'app reste utilisable lorsque le stockage local est indisponible.
    }
  }

  async function requestLocation() {
    rememberLocationPrimer();
    setShowLocationPrimer(false);
    await getPosition();
  }

  function skipLocation() {
    rememberLocationPrimer();
    setShowLocationPrimer(false);
  }

  function submitDestination(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (destinationPlace) {
      params.set("dropoff", destinationPlace.address);
      params.set("dropoffLat", String(destinationPlace.lat));
      params.set("dropoffLng", String(destinationPlace.lng));
    } else if (destination.trim()) {
      params.set("destination", destination.trim());
    }
    router.push(`/course${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#07111f]">
      <div className="mx-auto min-h-screen max-w-7xl bg-white lg:grid lg:grid-cols-[minmax(0,720px)_1fr] lg:shadow-2xl">
        <main className="relative min-h-screen overflow-hidden pb-24 lg:border-r lg:border-slate-200 lg:pb-10">
          <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur-xl sm:px-6">
            <div className="min-w-0">
              <Logo className="[&_img]:!h-8" />
              <button
                type="button"
                onClick={() => void requestLocation()}
                className="mt-0.5 flex max-w-[230px] items-center gap-1 text-xs font-semibold text-slate-500"
              >
                {locating ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
                ) : (
                  <Navigation className="h-3 w-3 text-amber-600" />
                )}
                <span className="truncate">
                  {locationError ? "Choisir ma position" : locationLabel}
                </span>
                <span aria-hidden>›</span>
              </button>
            </div>
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          <div className="px-4 pb-8 pt-5 sm:px-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-700">Bonjour 👋</p>
                <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight">
                  Où souhaitez-vous aller ?
                </h1>
              </div>
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:inline-flex">
                Service 24 h/24
              </span>
            </div>

            <form
              onSubmit={submitDestination}
              className="relative z-10 rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(7,17,31,0.14)]"
            >
              <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-2xl bg-slate-50 p-2">
                <AddressAutocomplete
                  label="Destination"
                  placeholder="Quartier, rue, mosquée, pharmacie…"
                  value={destinationPlace}
                  textValue={destination}
                  onSelect={(place) => {
                    setDestinationPlace(place);
                    setDestination(place.address);
                  }}
                  onClear={() => {
                    setDestinationPlace(null);
                    setDestination("");
                  }}
                  accent="dropoff"
                />
                <button
                  type="submit"
                  aria-label="Continuer vers la réservation"
                  disabled={!destinationPlace}
                  className="mb-[22px] flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#07111f] text-white disabled:opacity-35"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            <div className="mb-3 mt-7 flex items-center justify-between">
              <h2 className="text-base font-extrabold">Choisissez un service</h2>
              <span className="text-xs font-semibold text-slate-400">Tout SentraJet</span>
            </div>
            <section aria-label="Services SentraJet" className="grid auto-rows-[116px] grid-cols-3 gap-3 sm:auto-rows-[132px]">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <Link
                    key={service.title}
                    href={service.href}
                    className={`group relative overflow-hidden rounded-[1.4rem] ${service.layout}`}
                  >
                    <Image
                      src={service.image}
                      alt=""
                      fill
                      priority={index < 2}
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                      style={{ objectPosition: service.imagePosition }}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-b ${service.tone}`} />
                    <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 text-white ${
                      index === 0 || service.layout.includes("col-span-3") ? "p-4" : "p-3"
                    }`}>
                      <div>
                        <span className={`mb-2 items-center justify-center rounded-full bg-white/90 text-[#07111f] shadow-sm ${
                          index === 0 || service.layout.includes("col-span-3") ? "flex h-9 w-9" : "hidden h-7 w-7 sm:flex"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <h3 className={`${index === 0 ? "text-lg" : "text-xs sm:text-sm"} font-extrabold leading-tight text-white`}>
                          {service.title}
                        </h3>
                        <p className={`mt-0.5 font-medium text-white/75 ${
                          index === 0 || service.layout.includes("col-span-3") ? "text-xs" : "hidden sm:block sm:text-[10px]"
                        }`}>
                          {service.detail}
                        </p>
                      </div>
                      <span className={`mb-1 shrink-0 items-center justify-center rounded-full bg-white text-[#07111f] ${
                        index === 0 || service.layout.includes("col-span-3") ? "flex h-8 w-8" : "hidden"
                      }`}>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </section>

            <section className="mt-7">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-extrabold">Suggestions pour vous</h2>
                <Link href="/destinations" className="text-xs font-bold text-amber-700">
                  Tout voir
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {suggestions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.title} href={item.href} className="flex items-center gap-3 py-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">{item.title}</span>
                        <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  );
                })}
              </div>
            </section>

            <Link
              href="/allo-dakar"
              className="relative mt-5 block overflow-hidden rounded-[1.4rem] bg-emerald-950 p-5 text-white"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20" />
              <div className="relative">
                <span className="inline-flex rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-950">
                  Allo Dakar
                </span>
                <h2 className="mt-3 max-w-xs text-xl font-extrabold text-white">
                  Une place, un trajet, un Sénégal plus proche.
                </h2>
                <p className="mt-2 max-w-sm text-sm text-emerald-100/80">
                  Consultez les prochains départs interurbains de chauffeurs vérifiés.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                  Trouver un départ <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid h-[74px] max-w-[720px] grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:static lg:mt-4 lg:border lg:border-slate-200 lg:rounded-2xl lg:max-w-[calc(100%-48px)]">
            {[
              { label: "Accueil", href: "/", icon: Home, active: true },
              { label: "Réserver", href: "/course", icon: Navigation },
              { label: "Mes trajets", href: "/connexion?next=/compte/reservations", icon: CalendarDays },
              { label: "Profil", href: "/connexion", icon: UserRound },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                    item.active ? "text-amber-700" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </main>

        <aside className="relative hidden min-h-screen overflow-hidden bg-[#07111f] lg:block">
          <Image
            src="/images/hero-sen-trajet.png"
            alt="Service avec chauffeur SentraJet"
            fill
            priority
            className="object-cover opacity-55"
            sizes="45vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07111f]/20 via-[#07111f]/45 to-[#07111f]" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Chauffeurs et véhicules vérifiés
            </span>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight text-white">
              Votre mobilité, organisée de bout en bout.
            </h2>
            <p className="mt-4 max-w-md text-base text-white/70">
              Réservez, suivez votre prise en charge et retrouvez toutes vos prestations depuis une seule application.
            </p>
          </div>
        </aside>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111f]/55 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo className="[&_img]:!h-8" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 grid gap-2 text-sm font-bold">
              <Link href="/reserver" className="rounded-2xl bg-amber-400 px-4 py-3.5">Réserver un trajet</Link>
              <Link href="/flotte" className="rounded-2xl bg-slate-100 px-4 py-3.5">Louer une voiture</Link>
              <Link href="/allo-dakar" className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-emerald-800">Allo Dakar</Link>
              <Link href="/connexion" className="rounded-2xl px-4 py-3.5">Se connecter</Link>
              <Link href="/inscription" className="rounded-2xl px-4 py-3.5">Créer un compte</Link>
              <Link href="/faq" className="rounded-2xl px-4 py-3.5">Aide et assistance</Link>
            </nav>
            <p className="mt-auto rounded-2xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-500">
              Besoin d’aide pour réserver ? Notre équipe reste disponible 24 h/24.
            </p>
          </div>
        </div>
      )}

      {showLocationPrimer && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#07111f]/60 p-3 backdrop-blur-sm sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-primer-title"
            className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-800">
              <LocateFixed className="h-8 w-8" />
            </div>
            <h2 id="location-primer-title" className="mt-5 text-2xl font-extrabold">
              Une prise en charge plus simple
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Autorisez votre position pour renseigner automatiquement votre point de départ et faciliter l’arrivée du chauffeur. Vous pourrez toujours saisir une adresse manuellement.
            </p>
            <div className="mt-6 grid gap-2">
              <button
                type="button"
                onClick={() => void requestLocation()}
                className="rounded-2xl bg-amber-400 px-4 py-3.5 text-sm font-extrabold text-[#07111f]"
              >
                Utiliser ma position
              </button>
              <button
                type="button"
                onClick={skipLocation}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500"
              >
                Saisir mon adresse manuellement
              </button>
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Votre position sert uniquement à préparer et suivre vos prestations de transport.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
