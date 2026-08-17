"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listRoleHeadcounts, type RoleHeadcount } from "@/lib/superAdminOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const ROLE_CATALOG: Array<{ role: string; label: string; description: string; space: string }> = [
  { role: "super_admin", label: "Super Admin", description: "Administration profonde de la plateforme : utilisateurs, rôles, configuration, sécurité.", space: "/admin" },
  { role: "manager", label: "Manager", description: "Supervision transverse orientée décision : alertes, activité, flotte, partenaires.", space: "/manager" },
  { role: "ops", label: "Opérations", description: "Traitement des demandes, dispatch, missions, flotte au quotidien.", space: "/ops" },
  { role: "commercial", label: "Commercial", description: "Prospects, clients, demandes, devis et relances.", space: "/commercial" },
  { role: "finance", label: "Finance", description: "Paiements, factures, contrats et tarifs.", space: "/finance" },
  { role: "rh", label: "RH", description: "Chauffeurs, documents et suivi des dossiers.", space: "/rh" },
  { role: "fleet_manager", label: "Fleet Manager", description: "Véhicules, entretien, propriétaires et contrats d’exploitation.", space: "/fleet" },
  { role: "driver", label: "Chauffeur", description: "Exécution des missions affectées par SentraJet.", space: "/chauffeur" },
  { role: "client", label: "Client", description: "Réservation, paiement et suivi de trajet.", space: "/compte" },
  { role: "partner", label: "Prestataire / Revendeur", description: "Réservation B2B, carnet clients, factures.", space: "/partenaire" },
  { role: "provider", label: "Prestataire (alias)", description: "Équivalent partenaire — normalisé côté interface.", space: "/partenaire" },
  { role: "asset_partner", label: "Partenaire / Financeur", description: "Suivi des véhicules, contrats et revenus.", space: "/proprietaire" },
];

export default function AdminRolesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [headcounts, setHeadcounts] = useState<RoleHeadcount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (profile && profile.role !== "super_admin") {
      router.replace("/admin?forbidden=1");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    void listRoleHeadcounts()
      .then(setHeadcounts)
      .catch(() => setHeadcounts([]))
      .finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) return <BrandedLoader />;
  if (profile?.role !== "super_admin") return null;

  const countFor = (role: string) => headcounts.find((h) => h.role === role)?.count ?? 0;

  return (
    <>
      <SjSectionHead eyebrow="Administration" title="Catalogue des rôles" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Chaque rôle dispose de son propre espace, conformément au principe « un rôle = une
        expérience ». Le nombre d’utilisateurs reflète les affectations réelles (table `user_roles`).
      </p>
      <div className="sj-list">
        {ROLE_CATALOG.map((r) => (
          <SjCard key={r.role}>
            <div className="sj-between">
              <div>
                <b>{r.label}</b>
                <div className="sj-muted">{r.description}</div>
                <div className="sj-muted">Espace : <code>{r.space}</code></div>
              </div>
              <SjBadge tone={countFor(r.role) > 0 ? "success" : "info"}>{countFor(r.role)} utilisateur{countFor(r.role) !== 1 ? "s" : ""}</SjBadge>
            </div>
          </SjCard>
        ))}
      </div>
    </>
  );
}
