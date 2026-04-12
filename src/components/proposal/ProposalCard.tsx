"use client";

import { Star, CheckCircle, Shield, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Proposal } from "@/lib/proposals";

type Props = {
  proposal: Proposal;
  isOwner: boolean;
  currentUserId?: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  accepting?: boolean;
};

export function ProposalCard({
  proposal,
  isOwner,
  currentUserId,
  onAccept,
  onReject,
  accepting,
}: Props) {
  const driver = proposal.driver;
  const vehicle = proposal.vehicle;
  const isPending = proposal.status === "pending";
  const isMyProposal = !!currentUserId && proposal.driver_id === currentUserId;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
            {driver?.full_name?.charAt(0) || "C"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-neutral-900">
                {driver?.full_name || "Chauffeur"}
              </p>
              {driver?.is_verified && (
                <Shield className="h-4 w-4 text-blue-500" />
              )}
              {isMyProposal && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Votre proposition
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 text-sm text-neutral-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {driver?.average_rating?.toFixed(1) || "N/A"} ·{" "}
              {driver?.total_reviews || 0} avis
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-neutral-900">
            {proposal.price_fcfa.toLocaleString("fr-FR")}
          </p>
          <p className="text-xs text-neutral-500">FCFA</p>
        </div>
      </div>

      {vehicle && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <span>
            {vehicle.brand} {vehicle.model}
            {vehicle.year ? ` (${vehicle.year})` : ""}
          </span>
          <span className="text-neutral-300">·</span>
          <span>{vehicle.seats} places</span>
          {vehicle.air_conditioning && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="flex items-center gap-1 text-blue-600">
                <Snowflake className="h-3.5 w-3.5" /> Climatisé
              </span>
            </>
          )}
          {vehicle.is_verified && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3.5 w-3.5" /> Vérifié
              </span>
            </>
          )}
        </div>
      )}

      {proposal.message && (
        <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 italic">
          &ldquo;{proposal.message}&rdquo;
        </p>
      )}

      {proposal.status !== "pending" && (
        <div className="mt-3">
          {proposal.status === "accepted" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <CheckCircle className="h-3.5 w-3.5" /> Acceptée
            </span>
          )}
          {proposal.status === "rejected" && (
            <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              Refusée
            </span>
          )}
          {proposal.status === "withdrawn" && (
            <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              Retirée
            </span>
          )}
        </div>
      )}

      {isOwner && isPending && (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept?.(proposal.id)}
            isLoading={accepting}
          >
            Choisir cette offre
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReject?.(proposal.id)}
          >
            Refuser
          </Button>
        </div>
      )}
    </div>
  );
}
