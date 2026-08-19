"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { CheckCircle, XCircle } from "lucide-react";

function AlloDakarConfirmationContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const wave = searchParams.get("wave");
  const success = wave !== "cancel";

  return (
    <AlloDakarShell>
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
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
        <Link href="/allo-dakar" className="mt-6 inline-block rounded-2xl bg-[#1f6b4a] px-6 py-3 text-sm font-bold text-white">
          Retour à Allo Dakar
        </Link>
      </div>
    </AlloDakarShell>
  );
}

export default function AlloDakarConfirmationPage() {
  return (
    <Suspense fallback={<BrandedLoader fullScreen />}>
      <AlloDakarConfirmationContent />
    </Suspense>
  );
}
