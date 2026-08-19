"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listClients, type PlatformClient } from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function CommercialClientsPage() {
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void listClients()
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => [c.full_name, c.company_name, c.phone, c.email, c.matricule].some((v) => v?.toLowerCase().includes(q)));
  }, [clients, query]);

  return (
    <>
      <SjSectionHead title="Clients" />
      <div className="sj-field" style={{ marginBottom: 16 }}>
        <input placeholder="Rechercher un client (nom, société, téléphone, matricule)…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((c) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`}>
              <SjCard>
                <div className="sj-between">
                  <div>
                    <b>{c.full_name || c.company_name || "Client"}</b>
                    <div className="sj-muted">{c.matricule || "—"} · {c.phone || c.email || "—"}</div>
                  </div>
                  <span className="sj-badge info">{c.client_type === "entreprise" ? "Entreprise" : "Particulier"}</span>
                </div>
              </SjCard>
            </Link>
          ))}
          {!filtered.length ? <SjCard><p className="sj-muted">Aucun client trouvé.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
