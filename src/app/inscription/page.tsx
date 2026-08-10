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
import { Users, Car, ArrowLeft, Building2 } from "lucide-react";

type AuthMode = "email" | "phone";
type PhoneStep = "form" | "verify";
type RoleType = "client" | "partner" | "rental_owner";

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
    if (roleParam === "partenaire") {
      setRole("partner");
      setStep("form");
    }
    if (roleParam === "loueur" || roleParam === "proprietaire") {
      setRole("rental_owner");
      setStep("form");
    }
    if (roleParam === "client") {
      setRole("client");
      setStep("form");
    }
    if (roleParam === "chauffeur") {
      setRole("client");
      setStep("choice");
    }
  }, [searchParams]);

  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPartnerLikeRole = role === "partner" || role === "rental_owner";
  const canShowForm = role === "client" || isPartnerLikeRole;
  const signupButtonLabel =
    role === "partner"
      ? "S'inscrire comme partenaire"
      : role === "rental_owner"
        ? "S'inscrire comme propriétaire"
        : "Créer mon compte client (−10 %)";

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
            role,
            phone,
            ...(role === "partner" || role === "rental_owner" ? {} : {}),
          },
        },
      });
      if (err) {
        setError(formatAuthErrorMessage(err.message, "email"));
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (role === "client" && nextAfterAuth) {
        window.location.replace(nextAfterAuth);
        return;
      }
      if (isPartnerLikeRole) {
        window.location.replace(role === "rental_owner" ? "/proprietaire" : "/partenaire/onboarding");
        return;
      }
      router.refresh();
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
            role,
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
      if (role === "client" && nextAfterAuth) {
        window.location.replace(nextAfterAuth);
        return;
      }
      if (isPartnerLikeRole) {
        window.location.replace(role === "rental_owner" ? "/proprietaire" : "/partenaire/onboarding");
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
      title="Créer un compte"
      subtitle="Créez un compte client (−10 %) ou un espace partenaire B2B."
    >
        {/* Étape 1 : Choix Client / Partenaire / Propriétaire */}
        {step === "choice" && (
          <>
            <p className="mt-8 text-sm font-semibold text-slate-800">Je suis</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setRole("client");
                  setStep("form");
                  setError(null);
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/90 bg-white p-7 text-center shadow-sm transition-all hover:border-amber-400/80 hover:bg-amber-50/40"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Users className="h-7 w-7" />
                </div>
                <span className="text-lg font-semibold text-slate-900">Client</span>
                <span className="text-sm text-slate-600">
                  Je réserve une prestation SentraJet (−10 % avec compte)
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("partner");
                  setStep("form");
                  setError(null);
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/90 bg-white p-7 text-center shadow-sm transition-all hover:border-amber-400/80 hover:bg-amber-50/40"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Building2 className="h-7 w-7" />
                </div>
                <span className="text-lg font-semibold text-slate-900">Partenaire B2B</span>
                <span className="text-sm text-slate-600">
                  Hôtel, entreprise, agence — tarifs négociés
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("rental_owner");
                  setStep("form");
                  setError(null);
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/90 bg-white p-7 text-center shadow-sm transition-all hover:border-amber-400/80 hover:bg-amber-50/40 sm:col-span-2"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Car className="h-7 w-7" />
                </div>
                <span className="text-lg font-semibold text-slate-900">Propriétaire / investisseur</span>
                <span className="text-sm text-slate-600">
                  Mettre un véhicule dans le réseau SentraJet
                </span>
              </button>
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              Les chauffeurs sont recrutés et affectés par SentraJet — pas d’inscription marketplace ouverte.
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
                  {isPartnerLikeRole
                    ? "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous pour compléter votre espace partenaire."
                    : "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous."}
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
