"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { bookingStatusTone } from "@/lib/platformOps";

type Contract = {
  id: string;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  terms_summary: string | null;
};

export default function ProprietaireContratPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Contract[]>([]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const { data: owner } = await supabase
        .from("vehicle_owners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!owner?.id) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("vehicle_exploitation_contracts")
        .select("id, vehicle_label, monthly_amount_fcfa, status, start_date, end_date, terms_summary")
        .eq("owner_id", owner.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Contract[]);
    })();
  }, [user]);

  return (
    <>
      <SjSectionHead title="Mon contrat d’exploitation" />
      <div className="sj-list">
        {rows.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{c.vehicle_label}</b>
                <div className="sj-muted">
                  {Number(c.monthly_amount_fcfa).toLocaleString("fr-FR")} FCFA / mois
                </div>
                <div className="sj-muted">
                  {c.start_date || "Début à définir"} → {c.end_date || "—"}
                </div>
                {c.terms_summary ? <p style={{ marginTop: 10 }}>{c.terms_summary}</p> : null}
              </div>
              <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!rows.length ? (
          <SjCard>
            <p className="sj-muted">
              Aucun contrat pour le moment. Contactez SentraJet pour ouvrir un dossier Vehicle Partner.
            </p>
            <a className="sj-btn sj-btn-primary" href="https://wa.me/221788324069" target="_blank" rel="noreferrer">
              WhatsApp propriétaires
            </a>
          </SjCard>
        ) : null}
      </div>
    </>
  );
}
