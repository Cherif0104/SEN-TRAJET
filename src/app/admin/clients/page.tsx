"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listClients, type PlatformClient } from "@/lib/platformOps";

export default function AdminClientsPage() {
  const [rows, setRows] = useState<PlatformClient[]>([]);

  useEffect(() => {
    void listClients().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="CRM" title="Clients" />
      <div className="sj-grid sj-grid-3">
        {rows.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div className="sj-avatar">{(c.company_name || c.full_name || "?").slice(0, 1)}</div>
              <span className="sj-muted">{c.client_type}</span>
            </div>
            <h3 style={{ marginTop: 14 }}>{c.company_name || c.full_name || "Client"}</h3>
            <div className="sj-muted">{c.phone || c.email || "—"}</div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? <SjCard><p className="sj-muted">Aucun client enregistré.</p></SjCard> : null}
    </>
  );
}
