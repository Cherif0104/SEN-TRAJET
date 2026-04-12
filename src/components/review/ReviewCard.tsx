"use client";

import { StarRating } from "./StarRating";
import { TAG_LABELS, type Review, type ReviewTag } from "@/lib/reviews";

type Props = {
  review: Review;
};

export function ReviewCard({ review }: Props) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
            {review.reviewer?.full_name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {review.reviewer?.full_name || "Utilisateur"}
            </p>
            <p className="text-xs text-neutral-400">
              {new Date(review.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <StarRating value={review.rating} readonly size="sm" />
      </div>

      {review.comment && (
        <p className="mt-2 text-sm text-neutral-600">{review.comment}</p>
      )}

      {review.tags && review.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {review.tags.map((t) => (
            <span
              key={t.tag}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {TAG_LABELS[t.tag as ReviewTag] || t.tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
