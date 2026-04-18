"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { createPartner, generateInviteCode, getPartnerByUserId } from "@/lib/partners";
import { Car, CalendarClock, Wallet, Sparkles } from "lucide-react";

export default function PartenaireOnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [hasPartnerProfile, setHasPartnerProfile] = useState(false);
  const isRentalOwner = role === "rental_owner";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;
      setRole(profile?.role ?? null);
      const partner = await getPartnerByUserId(user.id).catch(() => null);
      if (!mounted) return;
      setHasPartnerProfile(Boolean(partner));
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
      router.replace(isRentalOwner ? "/partenaire/location/vehicules?setup=1" : "/partenaire");
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
        <h1 className="text-xl font-bold text-neutral-900">
          {isRentalOwner ? "Activez votre espace loueur pro" : "Complétez votre profil partenaire"}
        </h1>
        <p className="mt-1 text-neutral-600">
          {isRentalOwner
            ? "Renseignez votre structure pour accéder rapidement au catalogue véhicules, aux tarifs et à la gestion des disponibilités."
            : "Ces informations permettent d'identifier votre structure et de générer votre lien d'invitation pour les chauffeurs."}
        </p>

        {isRentalOwner && (
          <Card className="mt-4 border border-emerald-200 bg-emerald-50/40">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Sparkles className="h-4 w-4" /> Parcours express location
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button
                size="sm"
                variant="secondary"
                href={hasPartnerProfile ? "/partenaire/location/vehicules" : undefined}
                disabled={!hasPartnerProfile}
              >
                <Car className="mr-1 h-4 w-4" /> Catalogue
              </Button>
              <Button
                size="sm"
                variant="secondary"
                href={hasPartnerProfile ? "/partenaire/location/vehicules?setup=1&focus=tarifs" : undefined}
                disabled={!hasPartnerProfile}
              >
                <Wallet className="mr-1 h-4 w-4" /> Tarifs
              </Button>
              <Button
                size="sm"
                variant="secondary"
                href={hasPartnerProfile ? "/partenaire/location/reservations" : undefined}
                disabled={!hasPartnerProfile}
              >
                <CalendarClock className="mr-1 h-4 w-4" /> Disponibilités
              </Button>
            </div>
            {!hasPartnerProfile && (
              <p className="mt-2 text-xs text-emerald-800/90">
                Complétez d&apos;abord ce formulaire pour activer les accès rapides.
              </p>
            )}
          </Card>
        )}

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
              {isRentalOwner ? "Activer mon espace loueur" : "Créer mon espace partenaire"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
