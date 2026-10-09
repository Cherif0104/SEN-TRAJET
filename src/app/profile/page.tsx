"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saved, setSaved] = useState(false);

  async function save() {
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", profile?.id);
    if (!error) {
      await refreshProfile();
      setSaved(true);
    }
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  return (
    <AuthGate role="client">
      <AppShell>
        <section style={{ padding: "14px 18px 28px" }}>
          <p className="eyebrow">Compte</p>
          <h1 className="page-title">Mon profil</h1>
          <div className="card" style={{ padding: 18, marginTop: 24, display: "grid", gap: 15 }}>
            <div className="field"><label>Nom complet</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="field"><label>Téléphone</label><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" /></div>
            {saved ? <div className="success">Profil enregistré.</div> : null}
            <button className="primary-button" type="button" onClick={() => void save()}>Enregistrer</button>
            <button className="secondary-button" type="button" onClick={() => void logout()}>Se déconnecter</button>
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
