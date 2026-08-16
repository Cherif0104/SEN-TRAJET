"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";

type PartnerOrg = {
  id: string;
  matricule: string | null;
  legal_name: string;
  category: string;
  certification_status: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "danger"> = {
  actif: "success",
  approuve: "info",
  contrat_en_attente: "warning",
  en_verification: "warning",
  diagnostic: "info",
  prospect: "info",
  suspendu: "danger",
  archive: "danger",
};

export default function AdminPartenairesPage() {
  const [rows, setRows] = useState<PartnerOrg[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .from("partner_organizations")
        .select(
          "id, matricule, legal_name, category, certification_status, primary_contact_name, primary_contact_phone, created_at"
        )
        .order("created_at", { ascending: false });
      if (err) {
        setError(err.message);
        return;
      }
      setRows((data ?? []) as PartnerOrg[]);
    })();
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Réseau" title="Partenaires commerciaux" />
      <SjCard style={{ marginBottom: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Funnel certification — pas de compte Auth avant statut ACTIF. Un seul CRM maître SentraJet.
          L’espace partenaire externe est limité (demandes / factures). Propriétaires de véhicules :{" "}
          <Link href="/admin/proprietaires" className="underline">
            Propriétaires
          </Link>
          . Doc : <code className="text-xs">docs/operations/SENTRAJET_OS.md</code>.
        </p>
      </SjCard>
      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}
      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Organisation</th>
                <th>Catégorie</th>
                <th>Contact</th>
                <th>Certification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.matricule ?? "—"}</code>
                  </td>
                  <td>
                    <b>{p.legal_name}</b>
                  </td>
                  <td>{p.category}</td>
                  <td>
                    {p.primary_contact_name ?? "—"}
                    {p.primary_contact_phone ? (
                      <div className="sj-muted text-xs">{p.primary_contact_phone}</div>
                    ) : null}
                  </td>
                  <td>
                    <SjBadge tone={STATUS_TONE[p.certification_status] ?? "info"}>
                      {p.certification_status}
                    </SjBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="sj-muted" style={{ marginTop: 12 }}>
            Aucun prospect / partenaire. Créez-les depuis le CRM après contact WhatsApp (pas via inscription
            publique).
          </p>
        ) : null}
      </SjCard>
    </>
  );
}
