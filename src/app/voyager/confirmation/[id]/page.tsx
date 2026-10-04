"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { supabase } from "@/lib/supabase";

export default function VoyagerConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<"loading" | "paid" | "pending" | "cancel" | "error">("loading");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("wave") === "cancel") {
      setState("cancel");
      return;
    }
    let disposed = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      const { data, error } = await supabase
        .from("voyager_bookings")
        .select("payment_status")
        .eq("id", id)
        .maybeSingle();
      if (disposed) return;
      if (error || !data) {
        setState("error");
        return;
      }
      if (data.payment_status === "paid") {
        setState("paid");
      } else {
        setState("pending");
        if (attempts < 6) window.setTimeout(() => void check(), 2_000);
      }
    };
    void check();
    return () => {
      disposed = true;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-8 text-[#07111f]">
      <div className="mx-auto max-w-md">
        <Logo className="justify-center [&_img]:!h-8" />
        <section className="mt-8 rounded-[1.75rem] bg-white p-7 text-center shadow-xl">
          {state === "loading" ? (
            <BrandedLoader />
          ) : state === "paid" ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          ) : state === "pending" ? (
            <Clock3 className="mx-auto h-16 w-16 text-amber-500" />
          ) : (
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
          )}
          <h1 className="mt-5 text-2xl font-black">
            {state === "paid"
              ? "Billet confirmé"
              : state === "pending" || state === "loading"
                ? "Vérification du paiement"
                : state === "cancel"
                  ? "Paiement interrompu"
                  : "Statut indisponible"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {state === "paid"
              ? "Votre place Voyager est confirmée. Retrouvez les détails dans Mes trajets."
              : state === "pending" || state === "loading"
                ? "Wave traite encore la confirmation. Cette page se met à jour automatiquement."
                : "Aucun débit confirmé n’a été associé à cette réservation."}
          </p>
          <Link href="/compte/reservations" className="mt-6 block rounded-2xl bg-[#07111f] px-4 py-3.5 text-sm font-black text-white">
            Ouvrir Mes trajets
          </Link>
          <Link href="/interurbain" className="mt-2 block rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">
            Rechercher un autre départ
          </Link>
        </section>
      </div>
    </main>
  );
}
