"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/review/StarRating";
import { getBookingById, type PlatformBooking } from "@/lib/platformOps";
import { hasRatedBooking, submitRating } from "@/lib/ratingsAndComplaints";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { CheckCircle } from "lucide-react";

export default function AvisPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<PlatformBooking | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [serviceScore, setServiceScore] = useState(0);
  const [driverScore, setDriverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([getBookingById(bookingId).catch(() => null), hasRatedBooking(bookingId).catch(() => false)])
      .then(([b, rated]) => {
        setBooking(b);
        setAlreadyRated(rated);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  const driver = booking?.service_order?.dispatch?.driver ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking?.client_id || serviceScore === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitRating({
        bookingId,
        clientId: booking.client_id,
        driverId: driver?.id ?? null,
        serviceScore,
        driverScore: driver ? driverScore || serviceScore : null,
        comment,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’enregistrer votre avis.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <BrandedLoader fullScreen />;

  if (!booking?.client_id) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
          <Card className="py-12 text-center">
            <p className="text-neutral-600">Réservation introuvable ou inaccessible.</p>
          </Card>
        </main>
      </div>
    );
  }

  if (done || alreadyRated) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
          <Card className="py-12 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-neutral-900">Merci pour votre avis !</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Votre évaluation aide SentraJet Premium à améliorer son service.
            </p>
            <Button href="/compte" className="mt-6">
              Retour à mon espace
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-bold text-neutral-900">Évaluer votre trajet</h1>
        <p className="mt-1 text-neutral-600">
          {booking.pickup} → {booking.dropoff}
        </p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="text-center">
              <p className="mb-3 text-sm font-medium text-neutral-700">Note du service SentraJet</p>
              <div className="flex justify-center">
                <StarRating value={serviceScore} onChange={setServiceScore} size="lg" />
              </div>
            </div>

            {driver ? (
              <div className="text-center">
                <p className="mb-3 text-sm font-medium text-neutral-700">Note du chauffeur ({driver.full_name})</p>
                <div className="flex justify-center">
                  <StarRating value={driverScore} onChange={setDriverScore} size="lg" />
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Commentaire (optionnel)</label>
              <textarea
                className="w-full min-h-[100px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Partagez votre expérience…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={submitting} disabled={serviceScore === 0}>
              Envoyer mon avis
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
