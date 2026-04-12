"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, Car, Building2, Loader2, Shield, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Role = "client" | "chauffeur" | "partner" | "admin" | "super_admin" | "rental_owner";

const roles: { role: Role; label: string; description: string; icon: typeof Users }[] = [
  {
    role: "client",
    label: "Client",
    description: "Rechercher un trajet, réserver, voir mes réservations",
    icon: Users,
  },
  {
    role: "chauffeur",
    label: "Chauffeur",
    description: "Publier un trajet, gérer mes réservations, crédits",
    icon: Car,
  },
  {
    role: "partner",
    label: "Partenaire",
    description: "Mes chauffeurs, commissions, lien d'invitation",
    icon: Building2,
  },
  {
    role: "admin",
    label: "Admin",
    description: "Piloter l'ops plateforme, conformité et indicateurs",
    icon: Shield,
  },
  {
    role: "super_admin",
    label: "Super Admin",
    description: "Gouvernance multi-organisation et accès global",
    icon: Crown,
  },
  {
    role: "rental_owner",
    label: "Loueur",
    description: "Publier flotte location et suivre réservations de location",
    icon: Car,
  },
];

export default function ComptesTestPage() {
  const [loading, setLoading] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestLogin = async (role: Role) => {
    setError(null);
    setLoading(role);
    try {
      const res = await fetch("/api/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        setLoading(null);
        return;
      }
      if (data.email && data.password && data.redirect) {
        await supabase.auth.signOut();
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: data.email as string,
          password: data.password as string,
        });
        if (signInErr) {
          setError(signInErr.message ?? "Connexion impossible.");
          setLoading(null);
          return;
        }
        window.location.href = data.redirect as string;
        return;
      }
      setError("Réponse invalide.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          Comptes de démonstration
        </h1>
        <p className="mt-2 text-neutral-600">
          Un clic pour vous connecter et tester chaque parcours. Les comptes sont créés automatiquement si besoin.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {roles.map(({ role, label, description, icon: Icon }) => (
            <Card key={role} className="border-2 border-neutral-200">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-900">{label}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{description}</p>
                  <Button
                    className="mt-4"
                    size="lg"
                    onClick={() => handleTestLogin(role)}
                    disabled={loading !== null}
                  >
                    {loading === role ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Connexion…
                      </>
                    ) : (
                      <>Tester comme {label}</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          Vous serez redirigé vers l’espace correspondant après connexion.
          Déconnexion possible depuis le menu.
        </p>
      </main>
    </div>
  );
}
