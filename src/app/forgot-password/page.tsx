"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });
    if (resetError) setError(resetError.message);
    else setMessage("Le lien de récupération a été envoyé si ce compte existe.");
    setBusy(false);
  }

  return (
    <main className="mobile-screen auth-blueprint">
      <header className="auth-blueprint-header safe-top">
        <Link href="/login" aria-label="Retour"><ArrowLeft size={19} /></Link>
        <BrandLogo compact />
        <span />
      </header>
      <section className="auth-blueprint-body safe-bottom">
        <div className="auth-blueprint-heading">
          <h1>Mot de passe oublié ?</h1>
          <p>Saisissez votre email pour recevoir un lien sécurisé.</p>
        </div>
        <form className="auth-blueprint-form" onSubmit={submit}>
          <label className="auth-input">
            <Mail size={17} />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
          </label>
          {error ? <div className="error">{error}</div> : null}
          {message ? <div className="success">{message}</div> : null}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Envoi…" : "Envoyer le lien"} <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-security-note">
          <ShieldCheck size={21} />
          <span>Nous ne partageons jamais vos informations.</span>
        </div>
      </section>
    </main>
  );
}
