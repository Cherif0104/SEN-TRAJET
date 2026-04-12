"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/review/StarRating";
import { useAuth } from "@/hooks/useAuth";
import {
  submitReview,
  TAG_LABELS,
  type ReviewTag,
} from "@/lib/reviews";
import { CheckCircle } from "lucide-react";

const ALL_TAGS: ReviewTag[] = [
  "ponctuel",
  "courtois",
  "vehicule_propre",
  "conduite_sure",
  "climatisation_ok",
  "bon_prix",
];

export default function AvisPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<ReviewTag>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: ReviewTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;
    setError(null);
    setSubmitting(true);

    try {
      await submitReview({
        bookingId,
        reviewerId: user.id,
        reviewedId: user.id, // will be overridden by booking lookup in production
        rating,
        comment: comment || undefined,
        tags: Array.from(selectedTags),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
          <Card className="py-12 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-neutral-900">
              Merci pour votre avis !
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Votre évaluation aide la communauté SEN TRAJET.
            </p>
            <Button href="/" className="mt-6">
              Retour à l&apos;accueil
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
        <h1 className="text-xl font-bold text-neutral-900">
          Évaluer votre trajet
        </h1>
        <p className="mt-1 text-neutral-600">
          Comment s&apos;est passé votre voyage ?
        </p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="text-center">
              <p className="mb-3 text-sm font-medium text-neutral-700">
                Note globale
              </p>
              <div className="flex justify-center">
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              {rating > 0 && (
                <p className="mt-2 text-sm text-neutral-500">
                  {rating === 5
                    ? "Excellent !"
                    : rating === 4
                    ? "Très bien"
                    : rating === 3
                    ? "Correct"
                    : rating === 2
                    ? "Peut mieux faire"
                    : "Décevant"}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-neutral-700">
                Ce qui vous a plu
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                      selectedTags.has(tag)
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    {TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Commentaire (optionnel)
              </label>
              <textarea
                className="w-full min-h-[100px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Partagez votre expérience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={submitting}
              disabled={rating === 0}
            >
              Envoyer mon avis
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
