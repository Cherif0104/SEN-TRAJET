"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listRecentActivity, type RecentActivityItem } from "@/lib/managerOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ManagerActivitePage() {
  const [items, setItems] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listRecentActivity(50)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Manager" title="Activité récente" />
      <div className="sj-list">
        {items.map((item) => (
          <SjCard key={item.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {item.kind === "booking_status" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
              )}
              <div>
                <b>{item.label}</b>
                {item.detail ? <div className="sj-muted">{item.detail}</div> : null}
                <div className="sj-muted">{new Date(item.occurred_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          </SjCard>
        ))}
        {!items.length ? <SjCard><p className="sj-muted">Aucune activité récente.</p></SjCard> : null}
      </div>
    </>
  );
}
