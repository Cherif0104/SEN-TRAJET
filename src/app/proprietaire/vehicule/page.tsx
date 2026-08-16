"use client";

import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";

export default function ProprietaireVehiculePage() {
  return (
    <>
      <SjSectionHead title="Mon véhicule" />
      <SjCard>
        <p className="sj-muted">
          Fiche véhicule, documents (carte grise, assurance, visite technique), entretien et
          disponibilité seront reliés au contrat d’exploitation une fois votre dossier validé.
        </p>
      </SjCard>
    </>
  );
}
