"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BookingForm } from "@/components/sentrajet/BookingForm";
import { useAuth } from "@/hooks/useAuth";
import { ensureClientForUser } from "@/lib/platformOps";

export default function CompteReserverPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const id = await ensureClientForUser({
        userId: user.id,
        fullName: profile?.full_name,
        phone: profile?.phone,
        email: user.email,
      });
      setClientId(id);
    })();
  }, [user, profile]);

  return (
    <>
      <SjSectionHead eyebrow="Réservation" title="Nouvelle réservation" />
      <SjCard>
        {clientId ? (
          <BookingForm
            segment="client"
            clientId={clientId}
            onCreated={() => router.push("/compte/reservations")}
          />
        ) : (
          <p className="sj-muted">Préparation de votre espace client…</p>
        )}
      </SjCard>
    </>
  );
}
