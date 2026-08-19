"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { CheckCircle, XCircle } from "lucide-react";

function IntercityConfirmationContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const wave = searchParams.get("wave");
  const success = wave !== "cancel";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center sm:px-6">
        {success ? (
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        ) : (
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
        )}
        <h1 className="mt-4 text-xl font-bold text-neutral-900">
          {success ? "Paiement confirmé" : "Paiement non finalisé"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Réservation {params.id.slice(0, 8)} — {success ? "votre place est réservée." : "vous pourrez réessayer ou payer le chauffeur directement."}
        </p>
        <Link href="/intercite" className="mt-6 inline-block rounded-2xl bg-[#07111f] px-6 py-3 text-sm font-bold text-white">
          Retour à SentraJet Intercité
        </Link>
      </main>
      <Footer />
    </div>
  );
}

export default function IntercityConfirmationPage() {
  return (
    <Suspense fallback={<BrandedLoader fullScreen />}>
      <IntercityConfirmationContent />
    </Suspense>
  );
}
