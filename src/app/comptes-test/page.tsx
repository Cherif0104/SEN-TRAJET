"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, Car, Building2, Loader2, Shield, Crown, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Role = "client" | "chauffeur" | "partner" | "admin" | "super_admin" | "proprietaire";

const roles: { role: Role; label: string; description: string; icon: typeof Users }[] = [
  {
    role: "client",
    label: "Client",
    description: "Simuler / réserver une prestation SentraJet (/reserver)",
    icon: Users,
  },
  {
    role: "admin",
    label: "Admin",
    description: "Pipeline demandes, devis, dispatch",
    icon: Shield,
  },
  {
    role: "super_admin",
    label: "Super Admin",
    description: "Espace admin global",
    icon: Crown,
  },
  {
    role: "partner",
    label: "Partenaire B2B",
    description: "Tarifs partenaires, demandes entreprise",
    icon: Building2,
  },
  {
    role: "chauffeur",
    label: "Chauffeur flotte",
    description: "Missions assignées (pas de marketplace)",
    icon: Car,
  },
  {
    role: "proprietaire",
    label: "Propriétaire",
    description: "Espace propriétaire véhicule",
    icon: KeyRound,
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
        password?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        setLoading(null);
        return;
      }
      if (data.email && data.password && data.redirect) {
        await supabase.auth.signOut();
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInErr) {
          setError(signInErr.message ?? "Connexion impossible.");
          setLoading(null);
          return;
        }
        window.location.href = data.redirect;
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
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">QA · SentraJet Premium</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Comptes de démonstration</h1>
        <p className="mt-2 text-neutral-600">
          Un clic pour tester chaque espace. Disponible en local et sur Preview Vercel (désactivé en
          production sauf <code className="text-xs">ENABLE_TEST_ACCOUNTS=true</code>).
        </p>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {roles.map(({ role, label, description, icon: Icon }) => (
            <Card key={role} className="border-2 border-neutral-200">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-900">{label}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{description}</p>
                  <Button
                    className="mt-4"
                    size="lg"
                    onClick={() => void handleTestLogin(role)}
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

        <p className="mt-8 text-center text-sm text-neutral-500">
          Retour à la{" "}
          <Link href="/connexion" className="font-semibold text-amber-800 underline">
            connexion
          </Link>{" "}
          ou à la{" "}
          <Link href="/reserver" className="font-semibold text-amber-800 underline">
            réservation
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
