"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/profiles";

export default function CompteProfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { full_name: fullName, phone: phone || undefined });
      refreshProfile?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SjSectionHead title="Mon profil" />
      <SjCard>
        <form className="sj-form" onSubmit={handleSave}>
          <div className="sj-form-grid">
            <div className="sj-field">
              <label>Nom</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="sj-field">
              <label>Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="sj-field">
              <label>E-mail</label>
              <input value={user?.email || ""} disabled />
            </div>
            <div className="sj-field">
              <label>Rôle</label>
              <input value="Client" disabled />
            </div>
          </div>
          <button type="submit" className="sj-btn sj-btn-primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saved ? <p style={{ color: "#6de0b0", margin: 0 }}>Profil enregistré.</p> : null}
        </form>
      </SjCard>
    </>
  );
}
