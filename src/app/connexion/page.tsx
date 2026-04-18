"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AuthPageScaffold, AuthPageFallback } from "@/components/layout/AuthPageScaffold";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toE164Senegal } from "@/lib/phone";
type AuthMode = "email" | "phone";
type PhoneStep = "send" | "verify";

/** URLs internes autorisées après connexion (évite open redirect). */
function isAllowedNext(path: string): boolean {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  const allowed = [
    "/compte",
    "/chauffeur",
    "/partenaire",
    "/admin",
    "/dashboard",
    "/location",
    "/recherche",
    "/demande",
    "/trajet",
    "/reservation",
    "/messages",
    "/avis",
    "/",
  ];
  return allowed.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function hubPathForRole(role: string | undefined): string {
  if (role === "client") return "/compte";
  if (role === "driver") return "/chauffeur";
  if (role === "partner" || role === "partner_manager" || role === "partner_operator" || role === "rental_owner") return "/partenaire";
  if (role === "admin" || role === "super_admin" || role === "commercial" || role === "regional_manager" || role === "trainer") return "/admin";
  return "/";
}

async function resolvePostLoginRedirect(nextParam: string | null): Promise<string> {
  if (nextParam && isAllowedNext(nextParam)) return nextParam;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return "/";
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return hubPathForRole(prof?.role);
}

function ConnexionPageContent() {
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("send");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirection si déjà connecté — navigation forcée pour éviter blocage sur "Redirection…"
  useEffect(() => {
    if (authLoading || !user) return;
    const next = searchParams.get("next");
    const target = next && isAllowedNext(next) ? next : hubPathForRole(profile?.role);
    if (target !== "/") {
      window.location.replace(target);
      return;
    }
    void resolvePostLoginRedirect(next).then((resolved) => {
      window.location.replace(resolved || "/");
    });
  }, [authLoading, user, profile?.role, searchParams]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message ?? "Erreur de connexion.");
        setLoading(false);
        return;
      }
      const target = await resolvePostLoginRedirect(searchParams.get("next"));
      window.location.replace(target);
      return;
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
      });
      if (err) {
        setError(err.message ?? "Impossible d'envoyer le code.");
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
        setError(err.message ?? "Code invalide ou expiré.");
        setLoading(false);
        return;
      }
      const target = await resolvePostLoginRedirect(searchParams.get("next"));
      window.location.replace(target);
      return;
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  // Dès qu'un utilisateur est connecté, on affiche la redirection (pas le formulaire)
  if (!authLoading && user) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-neutral-100">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Redirection vers votre espace…</p>
        </main>
      </div>
    );
  }

  return (
    <AuthPageScaffold
      title="Connexion"
      subtitle="Réservez, publiez un trajet ou suivez vos courses depuis un seul espace."
    >
        <div className="mt-8 flex rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode("email");
              setError(null);
              setPhoneStep("send");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              authMode === "email"
                ? "bg-white text-emerald-800 shadow-sm ring-1 ring-black/5"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("phone");
              setError(null);
              setPhoneStep("send");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              authMode === "phone"
                ? "bg-white text-emerald-800 shadow-sm ring-1 ring-black/5"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Téléphone
          </button>
        </div>

        <Card className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/35">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {authMode === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" fullWidth isLoading={loading}>
                Se connecter
              </Button>
            </form>
          )}

          {authMode === "phone" && phoneStep === "send" && (
            <form onSubmit={handlePhoneSendOtp} className="space-y-4">
              <Input
                label="Numéro de téléphone"
                type="tel"
                placeholder="77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-neutral-500">
                Format Sénégal (+221). Vous recevrez un code par SMS.
              </p>
              <Button type="submit" fullWidth isLoading={loading}>
                Envoyer le code
              </Button>
            </form>
          )}

          {authMode === "phone" && phoneStep === "verify" && (
            <form onSubmit={handlePhoneVerifyOtp} className="space-y-4">
              <p className="text-sm text-neutral-600">
                Code envoyé au {phone || "numéro indiqué"}.
              </p>
              <Input
                label="Code reçu par SMS"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
              />
              <Button type="submit" fullWidth isLoading={loading}>
                Vérifier
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setPhoneStep("send");
                  setOtp("");
                }}
              >
                Changer de numéro
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-8 text-center text-sm text-slate-600">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
    </AuthPageScaffold>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <ConnexionPageContent />
    </Suspense>
  );
}
