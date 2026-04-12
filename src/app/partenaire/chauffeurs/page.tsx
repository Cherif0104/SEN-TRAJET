"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getPartnerByUserId, getPartnerDrivers, type Partner } from "@/lib/partners";
import { UserPlus, Copy, Check, ArrowLeft, User } from "lucide-react";

type DriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

export default function PartenaireChauffeursPage() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getPartnerByUserId(user.id)
      .then((p) => {
        setPartner(p ?? null);
        if (p) return getPartnerDrivers(p.id);
        return [];
      })
      .then(setDrivers)
      .catch(() => setDrivers([]));
  }, [user?.id]);

  const inviteUrl =
    typeof window !== "undefined" && partner
      ? `${window.location.origin}/inscription?invite=${partner.invite_code}`
      : "";

  const copyInviteLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/partenaire"
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Tableau de bord
          </Link>
          <h1 className="mt-2 text-xl font-bold text-neutral-900">Mes chauffeurs</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Chauffeurs inscrits via votre lien d&apos;invitation.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={copyInviteLink} disabled={!inviteUrl}>
          {inviteCopied ? (
            <><Check className="mr-2 h-4 w-4" /> Copié</>
          ) : (
            <><Copy className="mr-2 h-4 w-4" /> Copier le lien d&apos;invitation</>
          )}
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <UserPlus className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="mt-4 font-medium text-neutral-700">Aucun chauffeur rattaché</p>
            <p className="mt-2 max-w-sm text-sm text-neutral-500">
              Partagez votre lien d&apos;invitation aux chauffeurs. Lorsqu&apos;ils s&apos;inscrivent avec ce lien,
              ils apparaîtront ici.
            </p>
            <Button variant="primary" size="sm" className="mt-4" href="/partenaire">
              Aller au tableau de bord
            </Button>
            <Button variant="ghost" size="sm" className="mt-2" onClick={copyInviteLink} disabled={!inviteUrl}>
              <Copy className="mr-2 h-4 w-4" /> Copier le lien
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-neutral-200 px-4 py-3 sm:px-6">
              <p className="text-sm font-medium text-neutral-700">
                {drivers.length} chauffeur{drivers.length !== 1 ? "s" : ""} rattaché{drivers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ul className="divide-y divide-neutral-200">
              {drivers.map((d) => (
                <li key={d.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900">
                      {d.full_name || "Sans nom"}
                    </p>
                    {d.phone && (
                      <p className="text-sm text-neutral-500">{d.phone}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    Inscrit le{" "}
                    {new Date(d.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
