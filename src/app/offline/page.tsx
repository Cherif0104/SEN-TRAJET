import Link from "next/link";
import { Plane, RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07111f] px-5 text-white">
      <section className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-amber-300 text-[#07111f]">
          <Plane className="h-9 w-9" />
        </div>
        <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs text-slate-300">
          <WifiOff className="h-4 w-4 text-amber-300" />
          Mode hors ligne
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold">Connexion indisponible</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          L’application et les trajets déjà consultés restent accessibles. Une connexion est nécessaire
          pour rechercher un chauffeur ou confirmer un paiement.
        </p>
        <Link
          href="/"
          className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 font-extrabold text-[#07111f]"
        >
          <RefreshCw className="h-5 w-5" />
          Réessayer
        </Link>
      </section>
    </main>
  );
}
