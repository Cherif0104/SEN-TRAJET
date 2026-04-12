"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/profiles";

export default function CompteProfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);
    await updateProfile(user.id, { full_name: fullName, phone: phone || undefined, city: city || undefined });
    refreshProfile?.();
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mon profil</h1>
      <p className="mt-1 text-neutral-600">
        Modifiez vos informations personnelles.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Téléphone"
            type="tel"
            placeholder="+221 77 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Ville"
            placeholder="Dakar"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          {user?.email && (
            <p className="text-sm text-neutral-500">
              Email du compte : {user.email}
            </p>
          )}
          <Button type="submit" isLoading={saving}>
            {saved ? "Enregistré !" : "Enregistrer"}
          </Button>
        </form>
      </Card>
    </>
  );
}
