"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listAuditLogs, type AuditLogEntry } from "@/lib/superAdminOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function AdminSecuritePage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (profile && profile.role !== "super_admin") {
      router.replace("/admin?forbidden=1");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    void listAuditLogs(50)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) return <BrandedLoader />;
  if (profile?.role !== "super_admin") return null;

  return (
    <>
      <SjSectionHead eyebrow="Administration" title="Sécurité" />

      <div className="sj-grid sj-grid-2" style={{ marginBottom: 16 }}>
        <SjCard>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <b>Isolation des données</b>
              <div className="sj-muted">RLS active sur toutes les tables métier — chaque rôle ne voit que son périmètre.</div>
            </div>
          </div>
        </SjCard>
        <SjCard>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--color-warning)]" />
            <div>
              <b>Protection des mots de passe compromis</b>
              <div className="sj-muted">Désactivée au niveau Supabase Auth — à activer dans le tableau de bord Supabase.</div>
            </div>
          </div>
        </SjCard>
      </div>

      <SjCard style={{ marginBottom: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          La liste complète des avertissements de sécurité (fonctions exposées, policies) est
          disponible dans le tableau de bord Supabase (Database → Advisors). Cet écran présente le
          journal d’audit applicatif réel.
        </p>
      </SjCard>

      <SjSectionHead title="Journal d’audit" />
      <div className="sj-list">
        {logs.map((log) => (
          <SjCard key={log.id}>
            <div className="sj-between">
              <div>
                <b>{log.action}</b>
                <div className="sj-muted">{log.entity}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}</div>
              </div>
              <span className="sj-muted">{new Date(log.created_at).toLocaleString("fr-FR")}</span>
            </div>
          </SjCard>
        ))}
        {!logs.length ? <SjCard><p className="sj-muted">Aucune entrée dans le journal d’audit pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
