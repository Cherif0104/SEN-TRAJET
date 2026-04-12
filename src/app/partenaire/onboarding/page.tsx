"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { createPartner, generateInviteCode } from "@/lib/partners";

export default function PartenaireOnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expirée. Reconnectez-vous.");
        setLoading(false);
        return;
      }
      const inviteCode = generateInviteCode();
      await createPartner({
        user_id: user.id,
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        invite_code: inviteCode,
      });
      router.replace("/partenaire");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-neutral-900">Complétez votre profil partenaire</h1>
        <p className="mt-1 text-neutral-600">
          Ces informations permettent d&apos;identifier votre structure et de générer votre lien
          d&apos;invitation pour les chauffeurs.
        </p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <Input
              label="Nom de la structure / entreprise"
              placeholder="Ex: Transport Diallo"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <Input
              label="Nom du contact"
              placeholder="Mamadou Diallo"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              label="Téléphone"
              type="tel"
              placeholder="77 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="contact@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" fullWidth isLoading={loading}>
              Créer mon espace partenaire
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
