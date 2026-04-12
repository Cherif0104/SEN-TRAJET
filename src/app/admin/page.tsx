import { Card } from "@/components/ui/Card";
import { Users, MapPin, Calendar, Car, ShieldCheck, Wallet } from "lucide-react";

const kpis = [
  { label: "Chauffeurs", value: "—", icon: Users },
  { label: "Trajets", value: "—", icon: MapPin },
  { label: "Réservations", value: "—", icon: Calendar },
  { label: "Véhicules", value: "—", icon: Car },
  { label: "Conformité KYC", value: "—", icon: ShieldCheck },
  { label: "Commissions", value: "—", icon: Wallet },
];

export default function AdminPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">
        Tableau de bord admin
      </h1>
      <p className="mt-1 text-neutral-600">
        Vue d&apos;ensemble de la plateforme.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <Icon className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-neutral-500">{label}</p>
                <p className="text-2xl font-bold text-neutral-900">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <h3 className="font-semibold text-neutral-900">
          Carte / Activité
        </h3>
        <div className="mt-4 flex h-64 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500">
          Carte à intégrer
        </div>
      </Card>
    </>
  );
}
