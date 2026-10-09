"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CarFront, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      const isDriver = await promoteDriverIfRequested(data.user.user_metadata?.account_type);
      if (isDriver) {
        window.location.assign("/driver");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      window.location.assign(profile?.role === "driver" ? "/driver" : "/app");
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

  return (
    <main className="mobile-screen safe-top safe-bottom" style={{ paddingInline: 20 }}>
      <Link href="/" style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 15, background: "white", border: "1px solid var(--line)" }}>
        <ArrowLeft size={20} />
      </Link>
      <div style={{ marginTop: 34 }}>
        <p className="eyebrow">SentraJet</p>
        <h1 className="page-title">{mode === "login" ? "Bon retour parmi nous." : "Créer votre espace."}</h1>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          {mode === "login"
            ? "Connectez-vous pour accéder à vos courses."
            : "Un compte est obligatoire pour commander ou conduire."}
        </p>
      </div>

      {mode === "signup" ? (
        <div className="service-grid" style={{ marginTop: 26 }}>
          <button type="button" onClick={() => setRole("client")} className="card" style={{ minHeight: 130, padding: 15, borderWidth: 2, borderColor: role === "client" ? "var(--gold-deep)" : "var(--line)", textAlign: "left" }}>
            <UserRound color="var(--gold-deep)" />
            <strong style={{ display: "block", marginTop: 20 }}>Client</strong>
            <small className="muted">Je commande</small>
          </button>
          <button type="button" onClick={() => setRole("driver")} className="card" style={{ minHeight: 130, padding: 15, borderWidth: 2, borderColor: role === "driver" ? "var(--gold-deep)" : "var(--line)", textAlign: "left" }}>
            <CarFront color="var(--gold-deep)" />
            <strong style={{ display: "block", marginTop: 20 }}>Chauffeur</strong>
            <small className="muted">Je conduis</small>
          </button>
        </div>
      ) : null}

      <form onSubmit={submit} className="card" style={{ marginTop: 18, padding: 18, display: "grid", gap: 15 }}>
        {mode === "signup" ? (
          <>
            <div className="field">
              <label>Nom complet</label>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} required type="tel" autoComplete="tel" placeholder="+221 77 000 00 00" />
            </div>
          </>
        ) : null}
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="success">{message}</div> : null}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : `Créer mon compte ${role === "driver" ? "chauffeur" : "client"}`}
        </button>
      </form>

      <p className="muted" style={{ textAlign: "center", fontSize: 14, marginTop: 20 }}>
        {mode === "login" ? "Nouveau sur SentraJet ?" : "Vous avez déjà un compte ?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} style={{ color: "var(--gold-deep)", fontWeight: 850 }}>
          {mode === "login" ? "S’inscrire" : "Se connecter"}
        </Link>
      </p>
    </main>
  );
}
