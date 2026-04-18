"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ChauffeurError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chauffeur]", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-sm font-semibold text-red-900">Une erreur est survenue dans l&apos;espace chauffeur.</p>
      <p className="mt-2 text-xs text-red-800 break-words">{error.message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button type="button" size="sm" variant="secondary" href="/">
          Accueil
        </Button>
      </div>
    </div>
  );
}
