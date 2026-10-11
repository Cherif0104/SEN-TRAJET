"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/BrandLogo";

type AuthMode = "login" | "signup";
type SignupRole = "client" | "driver";

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("client");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function promoteDriverIfRequested(accountType: unknown) {
    if (accountType !== "driver") return false;
    const { error: rpcError } = await supabase.rpc("register_driver_application");
    if (rpcError) throw rpcError;
    return true;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, account_type: role }
          }
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setMessage("Compte créé. Vérifiez votre email, puis connectez-vous.");
          return;
        }
        const isDriver = await promoteDriverIfRequested(role);
        window.location.assign(isDriver ? "/driver" : "/app");
        return;
      }

      const identifier = email.trim();
      const credentials = identifier.includes("@")
        ? { email: identifier, password }
        : {
            phone: identifier.startsWith("+")
              ? identifier
              : `+${identifier.replace(/\D/g, "")}`,
            password
          };
      const { data, error: loginError } = await supabase.auth.signInWithPassword(credentials);
      if (loginError) throw loginError;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profile?.role === "admin") {
        window.location.assign("/admin");
        return;
      }
      const isDriver = profile?.role === "driver"
        || await promoteDriverIfRequested(data.user.user_metadata?.account_type);
      if (isDriver) {
        window.location.assign("/driver");
        return;
      }
      window.location.assign(profile?.role === "admin" ? "/admin" : profile?.role === "driver" ? "/driver" : "/app");
    } catch (reason) {
      const raw = reason instanceof Error ? reason.message : "Une erreur est survenue.";
      setError(
        /invalid login credentials/i.test(raw)
          ? "Email ou mot de passe incorrect."
          : /email not confirmed/i.test(raw)
            ? "Confirmez votre email avant de vous connecter."
            : /email rate limit exceeded|over_email_send_rate_limit/i.test(raw)
              ? "Trop de demandes ont été envoyées. Patientez quelques minutes avant de réessayer."
              : /email address .* is invalid|invalid email/i.test(raw)
                ? "Cette adresse email n’est pas acceptée. Vérifiez-la ou utilisez une autre adresse."
                : /failed to fetch|network|load failed/i.test(raw)
                  ? "Connexion au service momentanément impossible. Vérifiez votre réseau puis réessayez."
                  : raw
      );
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` }
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <main className={`mobile-screen auth-blueprint ${mode}`}>
      <header className="auth-blueprint-header safe-top">
        <Link href="/" aria-label="Retour"><ArrowLeft size={19} /></Link>
        <BrandLogo compact />
        <span />
      </header>
      <section className="auth-blueprint-body safe-bottom">
        <div className="auth-blueprint-heading">
          <h1>{mode === "login" ? "Bon retour !" : "Créer votre compte"}</h1>
          <p>{mode === "login" ? "Connectez-vous à votre compte" : "Rejoignez la communauté SentraJet"}</p>
        </div>

      {mode === "signup" ? (
        <div className="auth-role-switch">
          <button type="button" onClick={() => setRole("client")} className={role === "client" ? "active" : ""}>
            <UserRound size={16} /> Particulier
          </button>
          <button type="button" onClick={() => setRole("driver")} className={role === "driver" ? "active" : ""}>
            <Building2 size={16} /> Professionnel
          </button>
        </div>
      ) : null}

      <form onSubmit={submit} className="auth-blueprint-form">
        {mode === "signup" ? (
          <label className="auth-input">
            <UserRound size={17} />
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" placeholder="Nom complet" />
          </label>
        ) : null}
        <label className="auth-input phone">
          <Phone size={17} />
          {mode === "signup" ? <span>+221</span> : null}
          <input
            value={mode === "signup" ? phone : email}
            onChange={(event) => mode === "signup" ? setPhone(event.target.value) : setEmail(event.target.value)}
            required
            type={mode === "signup" ? "tel" : "text"}
            autoComplete={mode === "signup" ? "tel" : "username"}
            placeholder={mode === "signup" ? "77 123 45 67" : "Téléphone ou email"}
          />
        </label>
        {mode === "signup" ? (
          <label className="auth-input">
            <Mail size={17} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" autoComplete="email" placeholder="Email" />
          </label>
        ) : null}
        <label className="auth-input">
          <LockKeyhole size={17} />
          <input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mot de passe" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </label>
        {mode === "login" ? (
          <div className="auth-form-meta">
            <label><input type="checkbox" /> Se souvenir de moi</label>
            <Link href="/forgot-password">Mot de passe oublié ?</Link>
          </div>
        ) : (
          <label className="auth-terms">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} required />
            <span>J’accepte les <Link href="/terms">conditions d’utilisation</Link> et la politique de confidentialité.</span>
          </label>
        )}
        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="success">{message}</div> : null}
        <button className="auth-submit" type="submit" disabled={busy || (mode === "signup" && !acceptedTerms)}>
          {busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "S’inscrire"} <ArrowRight size={17} />
        </button>
      </form>

      {mode === "login" ? (
        <>
          <div className="auth-divider"><span>ou</span></div>
          <button type="button" className="google-button" onClick={() => void continueWithGoogle()}>
            <b>G</b> Continuer avec Google
          </button>
        </>
      ) : null}

      <p className="auth-switch-link">
        {mode === "login" ? "Nouveau sur SentraJet ?" : "Vous avez déjà un compte ?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? "S’inscrire" : "Se connecter"}
        </Link>
      </p>
      </section>
    </main>
  );
}
