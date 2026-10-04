"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, CreditCard, MapPin, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { getRentalBooking, type RentalBooking } from "@/lib/rentalMarketplace";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { authApiFetch } from "@/lib/authSession";

export default function RentalReservationPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<RentalBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("wave") === "cancel") {
      setMessage("Le paiement a été interrompu. Votre véhicule reste temporairement bloqué.");
    }
    void getRentalBooking(id)
      .then(setBooking)
      .catch((cause) => setMessage(cause instanceof Error ? cause.message : "Réservation introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  async function pay() {
    setPaying(true);
    setMessage(null);
    try {
      const payload = await authApiFetch<{
        error?: string;
        simulation?: boolean;
        checkout_url?: string;
      }>(
        "/api/checkout/wave/rental",
        {
          method: "POST",
          body: JSON.stringify({ bookingId: id }),
        },
        { fallbackError: "Paiement indisponible." },
      );
      if (payload.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }
      setMessage("Mode de démonstration : la réservation est enregistrée, mais aucun débit Wave n’a été effectué.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Paiement indisponible.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {loading ? <div className="flex justify-center py-24"><BrandedLoader /></div> : !booking ? (
          <div className="rounded-3xl bg-white p-8 text-center"><p className="font-bold text-red-700">{message || "Réservation introuvable."}</p><Link href="/flotte" className="mt-4 inline-block font-bold text-amber-700">Retour aux véhicules</Link></div>
        ) : (
          <>
            <div className="rounded-3xl bg-[#081426] p-6 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-widest text-amber-300">Réservation {booking.reference}</p><h1 className="mt-2 text-2xl font-black">{booking.listing.vehicle.brand} {booking.listing.vehicle.model}</h1><p className="mt-1 text-sm text-slate-300">Votre véhicule est bloqué pour la période choisie.</p></div>
                <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-400" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-3"><CalendarDays className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs text-slate-300">Période</p><b className="text-sm">{new Date(`${booking.startDate}T12:00:00`).toLocaleDateString("fr-FR")} → {new Date(`${booking.endDate}T12:00:00`).toLocaleDateString("fr-FR")}</b></div>
                <div className="rounded-2xl bg-white/5 p-3"><MapPin className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs text-slate-300">Retrait</p><b className="text-sm">{booking.pickupLocation}</b></div>
                <div className="rounded-2xl bg-white/5 p-3"><Clock3 className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs text-slate-300">Statut</p><b className="text-sm">{booking.paymentStatus === "paid" ? "Confirmée" : "Paiement attendu"}</b></div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-black text-[#081426]">Récapitulatif</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600"><span>{formatFcfa(booking.dailyRateFcfa)} × {booking.totalDays} jour{booking.totalDays > 1 ? "s" : ""}</span><b>{formatFcfa(booking.subtotalFcfa)}</b></div>
                <div className="flex justify-between text-slate-600"><span>Caution remboursable</span><b>{formatFcfa(booking.depositFcfa)}</b></div>
                <div className="flex justify-between border-t border-slate-100 pt-4 text-xl font-black text-[#081426]"><span>Total</span><span>{formatFcfa(booking.totalFcfa)}</span></div>
              </div>
              {message ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
              {booking.paymentStatus !== "paid" ? <button onClick={() => void pay()} disabled={paying} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 font-black text-[#081426] disabled:opacity-50"><CreditCard className="h-5 w-5" /> {paying ? "Ouverture de Wave…" : `Payer ${formatFcfa(booking.totalFcfa)} avec Wave`}</button> : <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800"><ShieldCheck className="h-5 w-5" /> Paiement confirmé</div>}
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">Après paiement, SentraJet confirme la remise du véhicule et prépare l’état des lieux de départ.</p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
