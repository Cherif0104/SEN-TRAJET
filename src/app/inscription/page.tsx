"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPageScaffold, AuthPageFallback } from "@/components/layout/AuthPageScaffold";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { toE164Senegal } from "@/lib/phone";
import {
  Car,
  ArrowLeft,
  Building2,
  CarTaxiFront,
  Plane,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

type AuthMode = "email" | "phone";
type PhoneStep = "form" | "verify";
type RoleType = "client";

function formatAuthErrorMessage(rawMessage: string | null | undefined, mode: AuthMode): string {
  const msg = String(rawMessage ?? "").toLowerCase();

  if (!msg) {
    return "Une erreur est survenue. Réessayez dans quelques instants.";
  }

  if (
    msg.includes("rate limit") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("email rate limit exceeded")
  ) {
    return mode === "email"
      ? "Trop de tentatives d'inscription par email en peu de temps. Patientez quelques minutes ou utilisez l'inscription par téléphone."
      : "Trop de tentatives en peu de temps. Patientez quelques minutes puis réessayez.";
  }

  if (msg.includes("user already registered")) {
    return "Ce compte existe déjà. Connectez-vous ou utilisez un autre email.";
  }

  if (msg.includes("invalid email")) {
    return "Adresse email invalide. Vérifiez le format puis réessayez.";
  }

  if (msg.includes("password")) {
    return "Mot de passe invalide. Utilisez un mot de passe plus robuste.";
  }

  if (msg.includes("otp")) {
    return "Code SMS invalide ou expiré. Demandez un nouveau code.";
  }

  return rawMessage ?? "Une erreur est survenue. Réessayez dans quelques instants.";
}

function safeNext(path: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

function InscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"choice" | "form">("choice");
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RoleType>("client");
  const nextAfterAuth = safeNext(searchParams.get("next"));

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "partenaire" || roleParam === "partner") {
      router.replace("/devenir-partenaire");
      return;
    }
    if (roleParam === "loueur" || roleParam === "proprietaire") {
      router.replace("/devenir-partenaire?profil=proprietaire");
      return;
    }
    if (roleParam === "client") {
      setRole("client");
      setStep("form");
    }
    if (roleParam === "chauffeur") {
      setRole("client");
      setStep("choice");
    }
  }, [searchParams, router]);

  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /** Inscription publique = client uniquement (OS SentraJet). */
  const canShowForm = role === "client";
  const signupButtonLabel = "Créer mon compte client (−10 %)";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: "client",
            phone,
          },
        },
      });
      if (err) {
        setError(formatAuthErrorMessage(err.message, "email"));
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (nextAfterAuth) {
        window.location.replace(nextAfterAuth);
        return;
      }
      window.location.replace("/compte");
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const e164 = toE164Senegal(phone);
    if (!e164) {
      setError("Numéro invalide. Utilisez un numéro sénégalais (ex: 77 123 45 67).");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: {
          data: {
            full_name: name,
            role: "client",
          },
        },
      });
      if (err) {
        setError(formatAuthErrorMessage(err.message, "phone"));
        setLoading(false);
        return;
      }
      setPhoneStep("verify");
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const e164 = toE164Senegal(phone);
    if (!e164 || !otp.trim()) {
      setError("Code requis.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: e164,
        token: otp.trim(),
        type: "sms",
      });
      if (err) {
        setError(formatAuthErrorMessage(err.message, "phone"));
        setLoading(false);
        return;
      }
      await supabase.auth.getUser();
      if (nextAfterAuth) {
        window.location.replace(nextAfterAuth);
        return;
      }
      window.location.replace("/compte");
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageScaffold
      eyebrow="Bienvenue"
      title="Comment utiliserez-vous SentraJet ?"
      subtitle="Un seul écosystème, avec un espace adapté à votre activité."
    >
        {step === "choice" && (
          <>
            <div className="mt-6 rounded-[1.6rem] bg-[#07111f] p-5 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                SentraJet
              </p>
              <h2 className="mt-2 text-xl font-black text-white">Je souhaite me déplacer</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Course immédiate, aéroport, Allo Dakar et location depuis le même compte.
              </p>
              <button
                type="button"
                onClick={() => {
                  setRole("client");
                  setStep("form");
                  setError(null);
                }}
                className="mt-5 flex w-full items-center justify-between rounded-2xl bg-amber-400 px-4 py-3.5 text-left text-[#07111f]"
              >
                <span>
                  <span className="block text-sm font-black">Créer mon compte client</span>
                  <span className="mt-0.5 block text-[11px] font-semibold opacity-70">
                    Réserver et suivre mes trajets
                  </span>
                </span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">Je travaille avec SentraJet</p>
                <p className="mt-0.5 text-xs text-slate-400">SentraJet Pro · dossier contrôlé</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                Pro
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
              <Link
                href="/devenir-chauffeur"
                className="flex items-center gap-3 p-4 transition hover:bg-slate-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Plane className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900">Chauffeur taxi</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Courses urbaines et transferts AIBD</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
              <Link
                href="/allo-dakar/chauffeur"
                className="flex items-center gap-3 p-4 transition hover:bg-slate-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CarTaxiFront className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900">Chauffeur Allo Dakar</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Publier mes départs interurbains</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
              <Link
                href="/devenir-partenaire"
                className="flex items-center gap-3 p-4 transition hover:bg-slate-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900">Entreprise ou apporteur</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Réserver pour des clients ou collaborateurs</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
              <Link
                href="/devenir-partenaire?profil=proprietaire"
                className="flex items-center gap-3 p-4 transition hover:bg-slate-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Car className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900">Propriétaire de véhicule</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Confier un véhicule et suivre son exploitation</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Les espaces professionnels sont activés après vérification des documents par SentraJet.
            </p>
          </>
        )}

        {/* Étape formulaire */}
        {step === "form" && canShowForm && (
          <>
            <button
              type="button"
              onClick={() => setStep("choice")}
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-amber-800"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>

            <div className="mt-6 flex rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => { setAuthMode("email"); setError(null); setPhoneStep("form"); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${authMode === "email" ? "bg-white text-emerald-800 shadow-sm ring-1 ring-black/5" : "text-slate-600 hover:text-slate-900"}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("phone"); setError(null); setPhoneStep("form"); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${authMode === "phone" ? "bg-white text-emerald-800 shadow-sm ring-1 ring-black/5" : "text-slate-600 hover:text-slate-900"}`}
              >
                Téléphone
              </button>
            </div>

            <Card className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/35">
              {success && authMode === "email" && (
                <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 ring-1 ring-emerald-200/60">
                  Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.
                </p>
              )}
              {error && (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              {authMode === "email" && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <Input label="Nom complet" placeholder="Mamadou Diallo" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input label="Email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <Button type="submit" fullWidth isLoading={loading}>
                    {signupButtonLabel}
                  </Button>
                </form>
              )}

              {authMode === "phone" && phoneStep === "form" && (
                <form onSubmit={handlePhoneSendOtp} className="space-y-4">
                  <Input label="Nom complet" placeholder="Mamadou Diallo" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input label="Numéro de téléphone" type="tel" placeholder="77 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  <p className="text-xs text-neutral-500">Format Sénégal (+221). Vous recevrez un code par SMS.</p>
                  <Button type="submit" fullWidth isLoading={loading}>Envoyer le code</Button>
                </form>
              )}

              {authMode === "phone" && phoneStep === "verify" && (
                <form onSubmit={handlePhoneVerifyOtp} className="space-y-4">
                  <p className="text-sm text-neutral-600">Code envoyé au {phone || "numéro indiqué"}.</p>
                  <Input label="Code reçu par SMS" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} required />
                  <Button type="submit" fullWidth isLoading={loading}>Créer mon compte</Button>
                  <Button type="button" variant="ghost" fullWidth onClick={() => { setPhoneStep("form"); setOtp(""); }}>Changer de numéro</Button>
                </form>
              )}
            </Card>
          </>
        )}

        <p className="mt-8 text-center text-sm text-slate-600">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-semibold text-amber-800 hover:text-amber-900 hover:underline">
            Se connecter
          </Link>
        </p>
    </AuthPageScaffold>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <InscriptionPageContent />
    </Suspense>
  );
}
