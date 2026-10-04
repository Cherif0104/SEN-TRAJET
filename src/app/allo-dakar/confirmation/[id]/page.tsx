"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { CheckCircle, Clock3, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

function AlloDakarConfirmationContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const wave = searchParams.get("wave");
  const [state, setState] = useState<"loading" | "paid" | "pending" | "cancel" | "error">(
    wave === "cancel" ? "cancel" : "loading",
  );

  useEffect(() => {
    if (wave === "cancel") return;
    let cancelled = false;
    let attempts = 0;
    const checkPayment = async () => {
      attempts += 1;
      const { data, error } = await supabase
        .from("allo_dakar_bookings")
        .select("payment_status")
        .eq("id", params.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState("error");
        return;
      }
      if (data.payment_status === "paid") {
        setState("paid");
        return;
      }
      setState("pending");
      if (attempts < 6) window.setTimeout(() => void checkPayment(), 2_000);
    };
    void checkPayment();
    return () => {
      cancelled = true;
    };
  }, [params.id, wave]);

  const paid = state === "paid";
  const cancelled = state === "cancel";

  return (
    <AlloDakarShell>
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
        {state === "loading" ? (
          <BrandedLoader />
        ) : paid ? (
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        ) : state === "pending" ? (
          <Clock3 className="mx-auto h-16 w-16 text-amber-500" />
        ) : (
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
        )}
        <h1 className="mt-4 text-xl font-bold text-neutral-900">
          {paid
            ? "Paiement confirmé"
            : state === "pending" || state === "loading"
              ? "Vérification du paiement"
              : cancelled
                ? "Paiement non finalisé"
                : "Statut indisponible"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Réservation {params.id.slice(0, 8)} —{" "}
          {paid
            ? "votre place est réservée."
            : state === "pending" || state === "loading"
              ? "Wave traite encore la confirmation. Cette page se met à jour automatiquement."
              : "aucun paiement confirmé n’a été enregistré."}
        </p>
        <Link href="/compte/reservations" className="mt-6 inline-block rounded-2xl bg-[#1f6b4a] px-6 py-3 text-sm font-bold text-white">
          Voir mes trajets
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
