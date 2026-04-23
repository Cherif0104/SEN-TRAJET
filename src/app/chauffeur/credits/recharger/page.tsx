"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PackageCard } from "@/components/credits/PackageCard";
import { useAuth } from "@/hooks/useAuth";
import {
  getCreditPackages,
  createPaymentIntent,
  createWaveCheckoutSession,
  confirmWaveSimulation,
  type CreditPackage,
} from "@/lib/wallet";
import Image from "next/image";
import { Smartphone, Gift, TestTube } from "lucide-react";

const PROVIDERS = [
  {
    id: "wave" as const,
    name: "Wave",
    color: "bg-blue-500",
  },
  {
    id: "orange_money" as const,
    name: "Orange Money",
    color: "bg-orange-500",
  },
  {
    id: "free_money" as const,
    name: "Free Money",
    color: "bg-green-600",
  },
];

function RechargerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<
    "wave" | "orange_money" | "free_money" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waveMessage, setWaveMessage] = useState<
    "success" | "cancel" | "free" | null
  >(null);
  const [creditsConfig, setCreditsConfig] = useState<{
    simulation?: boolean;
    free_period?: boolean;
  }>({});

  useEffect(() => {
    fetch("/api/credits/config")
      .then((r) => r.json())
      .then(setCreditsConfig)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const wave = searchParams.get("wave");
    const intentId = searchParams.get("intent_id");
    if (wave === "simulate" && intentId) {
      let cancelled = false;
      confirmWaveSimulation(intentId)
        .then(() => {
          if (!cancelled) {
            setWaveMessage("success");
            setTimeout(() => router.replace("/chauffeur/credits"), 3000);
          }
        })
        .catch(() => {
          if (!cancelled) setWaveMessage("cancel");
        });
      return () => {
        cancelled = true;
      };
    }
    if (wave === "success" || wave === "cancel") {
      setWaveMessage(wave);
      const t = setTimeout(() => router.replace("/chauffeur/credits"), 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (waveMessage === "success" && creditsConfig.free_period) {
      setWaveMessage("free");
    }
  }, [waveMessage, creditsConfig.free_period]);

  useEffect(() => {
    getCreditPackages()
      .then((pkgs) => {
        setPackages(pkgs);
        if (pkgs.length > 0) setSelectedPkg(pkgs[1] || pkgs[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!user || !selectedPkg || !selectedProvider) return;
    setProcessing(true);
    try {
      if (selectedProvider === "wave") {
        const res = await createWaveCheckoutSession(selectedPkg.id);
        window.location.href = res.checkout_url;
        return;
      }
      await createPaymentIntent({
        driverId: user.id,
        packageId: selectedPkg.id,
        amountFcfa: selectedPkg.price_fcfa,
        provider: selectedProvider,
      });
      setSuccess(true);
      setTimeout(() => router.push("/chauffeur/credits"), 2000);
    } catch (err) {
      console.error("Erreur paiement:", err);
    } finally {
      setProcessing(false);
    }
  };

  if (waveMessage) {
    const isSuccess = waveMessage === "success" || waveMessage === "free";
    return (
      <Card className="mt-6 py-12 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess ? "bg-green-100" : "bg-amber-100"
          }`}
        >
          <Smartphone
            className={`h-8 w-8 ${
              isSuccess ? "text-green-600" : "text-amber-600"
            }`}
          />
        </div>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">
          {waveMessage === "success" && "Paiement réussi"}
          {waveMessage === "free" && "Crédits offerts"}
          {waveMessage === "cancel" && "Paiement annulé"}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {waveMessage === "success" &&
            "Vos crédits ont été ajoutés (ou le seront sous peu)."}
          {waveMessage === "free" &&
            "Période de gratuité : vos crédits ont été ajoutés."}
          {waveMessage === "cancel" && "Aucun prélèvement effectué."}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Redirection vers vos crédits…
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  if (success) {
    return (
      <Card className="mt-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Smartphone className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">
          Demande de paiement envoyée
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Vérifiez votre téléphone pour confirmer le paiement via{" "}
          {PROVIDERS.find((p) => p.id === selectedProvider)?.name}.
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Vos crédits seront ajoutés dès confirmation.
        </p>
      </Card>
    );
  }

  return (
    <>
      {(creditsConfig.free_period || creditsConfig.simulation) && (
        <Card className="mb-4 flex items-center gap-3 border-amber-200 bg-amber-50 py-3">
          {creditsConfig.free_period ? (
            <>
              <Gift className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">
                  Période de gratuité
                </p>
                <p className="text-sm text-amber-800">
                  Les recharges sont offertes. Choisissez un pack et validez pour recevoir vos crédits.
                </p>
              </div>
            </>
          ) : (
            <>
              <TestTube className="h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="font-medium text-neutral-900">
                  Mode simulation
                </p>
                <p className="text-sm text-neutral-600">
                  Paiements simulés (Wave non connecté). Les crédits sont crédités sans prélèvement réel.
                </p>
              </div>
            </>
          )}
        </Card>
      )}

      <h1 className="text-xl font-bold text-neutral-900">
        Recharger mes crédits
      </h1>
      <p className="mt-1 text-neutral-600">
        Choisissez un pack puis votre moyen de paiement.
      </p>

      <div className="mt-6 space-y-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={selectedPkg?.id === pkg.id}
            onSelect={setSelectedPkg}
          />
        ))}
      </div>

      {selectedPkg && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-neutral-900">
            Moyen de paiement
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProvider(p.id)}
                className={`rounded-xl border-2 px-3 py-4 text-center transition-all ${
                  selectedProvider === p.id
                    ? "border-primary bg-primary/5"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${p.color}`}
                >
                  {p.id === "wave" ? (
                    <Image
                      src="/wave-sn-logo.png"
                      alt="Wave Sénégal"
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px]"
                    />
                  ) : (
                    <Smartphone className="h-5 w-5 text-white" />
                  )}
                </div>
                <p className="text-xs font-medium text-neutral-700">
                  {p.name}
                </p>
              </button>
            ))}
          </div>

          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Total à payer</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {selectedPkg.price_fcfa.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">Vous recevez</p>
                <p className="text-2xl font-bold text-primary">
                  {selectedPkg.credits} crédits
                </p>
              </div>
            </div>
          </Card>

          <Button
            fullWidth
            size="lg"
            className="mt-4"
            onClick={handlePurchase}
            isLoading={processing}
            disabled={!selectedProvider}
          >
            Payer avec{" "}
            {PROVIDERS.find((p) => p.id === selectedProvider)?.name ||
              "..."}
          </Button>
        </>
      )}
    </>
  );
}

export default function RechargerPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-neutral-200" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-neutral-200" />
          ))}
        </div>
      }
    >
      <RechargerContent />
    </Suspense>
  );
}
