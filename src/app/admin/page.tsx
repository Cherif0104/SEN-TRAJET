"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  MapPin,
  Calendar,
  Building2,
  UserRound,
  RadioTower,
} from "lucide-react";
import { getAdminOpsCounts } from "@/lib/adminOps";

export default function AdminPage() {
  const [counts, setCounts] = useState({
    drivers: 0,
    clients: 0,
    partners: 0,
    bookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminOpsCounts()
      .then((c) =>
        setCounts({
          drivers: c.drivers,
          clients: c.clients,
          partners: c.partners,
          bookings: c.bookings,
        })
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "Clients", value: counts.clients, icon: UserRound, href: "/admin/clients" },
    { label: "Partenaires B2B", value: counts.partners, icon: Building2, href: "/admin/partenaires" },
    { label: "Chauffeurs flotte", value: counts.drivers, icon: Users, href: "/admin/chauffeurs" },
    { label: "Réservations", value: counts.bookings, icon: Calendar, href: "/admin/reservations" },
  ];

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">
        Espace société · SentraJet Premium
      </h1>
      <p className="mt-1 text-neutral-600">
        Pilotez clients, partenaires B2B, flotte et dispatch des missions.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="transition hover:border-primary/40">
              <div className="flex items-center gap-3">
                <Icon className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm text-neutral-500">{label}</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {loading ? "…" : value}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
              <RadioTower className="h-5 w-5 text-primary" />
              Dispatch
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Assignez les réservations aux chauffeurs de la flotte SentraJet.
            </p>
          </div>
          <Button variant="primary" size="sm" href="/admin/dispatch">
            Ouvrir le dispatch
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
          <MapPin className="h-5 w-5 text-primary" />
          Modèle opérationnel
        </h3>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-600">
          <li>Clients et partenaires réservent sur la plateforme.</li>
          <li>Les partenaires disposent de tarifs négociés (contrats).</li>
          <li>Les chauffeurs appartiennent à la flotte et reçoivent des missions.</li>
        </ul>
      </Card>
    </>
  );
}
