"use client";

import { useState } from "react";
import { ProposalCard } from "./ProposalCard";
import { acceptProposal, rejectProposal, type Proposal } from "@/lib/proposals";

type Props = {
  proposals: Proposal[];
  isOwner: boolean;
  clientId?: string;
  currentUserId?: string;
  onUpdate?: () => void;
  /** Appelé après acceptation réussie d'une proposition (ex: redirection vers Mes réservations) */
  onAccepted?: () => void;
};

export function ProposalList({
  proposals,
  isOwner,
  clientId,
  currentUserId,
  onUpdate,
  onAccepted,
}: Props) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (proposalId: string) => {
    if (!clientId) return;
    setAcceptingId(proposalId);
    try {
      await acceptProposal(proposalId, clientId);
      onUpdate?.();
      onAccepted?.();
    } catch (err) {
      console.error("Erreur acceptation:", err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await rejectProposal(proposalId);
      onUpdate?.();
    } catch (err) {
      console.error("Erreur rejet:", err);
    }
  };

  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-neutral-200 py-12 text-center">
        <p className="text-neutral-500">
          Aucune proposition pour le moment
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          Les chauffeurs envoient leurs offres en temps réel
        </p>
      </div>
    );
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const others = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <p className="text-sm font-medium text-neutral-600">
          {pending.length} proposition{pending.length > 1 ? "s" : ""} en attente
        </p>
      )}
      {pending.map((p) => (
        <ProposalCard
          key={p.id}
          proposal={p}
          isOwner={isOwner}
          currentUserId={currentUserId}
          onAccept={handleAccept}
          onReject={handleReject}
          accepting={acceptingId === p.id}
        />
      ))}
      {others.length > 0 && pending.length > 0 && (
        <p className="mt-4 text-sm font-medium text-neutral-400">
          Propositions traitées
        </p>
      )}
      {others.map((p) => (
        <ProposalCard
          key={p.id}
          proposal={p}
          isOwner={isOwner}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
