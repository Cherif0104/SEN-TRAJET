"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function DevenirChauffeurPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/provider-applications", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Envoi impossible.");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Envoi impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#07111f]">
      <div className="mx-auto min-h-screen max-w-xl bg-white">
        <header className="flex h-16 items-center gap-3 border-b border-slate-100 px-4">
          <Link href="/inscription" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="[&_img]:!h-7" />
        </header>

        <section className="px-4 py-6">
          {sent ? (
            <div className="rounded-[1.7rem] bg-emerald-950 p-6 text-white">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <h1 className="mt-5 text-2xl font-black text-white">Candidature reçue</h1>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/75">
                L’équipe SentraJet vérifiera votre permis, votre véhicule et la carte grise avant toute activation.
              </p>
              <Link href="/" className="mt-6 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-950">
                Revenir à l’accueil
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">SentraJet Pro</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Devenir chauffeur taxi</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Recevez des courses aéroport à proximité. L’accès est activé uniquement après validation interne.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-100 p-3 text-xs font-bold text-slate-600">
                  <ShieldCheck className="mb-2 h-5 w-5 text-emerald-600" />
                  Chauffeur vérifié
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-xs font-bold text-slate-600">
                  <FileCheck2 className="mb-2 h-5 w-5 text-amber-700" />
                  Véhicule contrôlé
                </div>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <Field label="Nom complet" name="fullName" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Téléphone" name="phone" type="tel" required />
                  <Field label="Email" name="email" type="email" />
                </div>
                <Field label="N° du permis" name="licenseNumber" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Marque" name="vehicleBrand" required />
                  <Field label="Modèle" name="vehicleModel" required />
                </div>
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Immatriculation" name="plateNumber" required />
                  <Field label="Places" name="seats" type="number" min="1" max="30" required />
                </div>
                <label className="block rounded-2xl border border-slate-200 p-3">
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Carte grise (image ou PDF)
                  </span>
                  <input name="greyCard" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-bold file:text-amber-900" />
                </label>
                {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
                <button type="submit" disabled={loading} className="w-full rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-[#07111f] disabled:opacity-50">
                  {loading ? "Envoi sécurisé…" : "Envoyer ma candidature"}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-slate-400">
                  Aucun chauffeur n’est mis en ligne automatiquement. SentraJet contrôle chaque dossier.
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 px-3 py-2">
      <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <input name={name} type={type} required={required} min={min} max={max} className="mt-1 w-full bg-transparent text-sm font-bold outline-none" />
    </label>
  );
}
