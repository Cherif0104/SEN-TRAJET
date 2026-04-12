"use client";

import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: Props) {
  const sizeClass = SIZES[size];

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            className={`transition-transform ${
              readonly
                ? "cursor-default"
                : "cursor-pointer hover:scale-110 active:scale-95"
            }`}
          >
            <Star
              className={`${sizeClass} ${
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-neutral-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
