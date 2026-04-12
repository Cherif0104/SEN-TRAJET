"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Car,
  Calendar,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminZone } from "@/lib/rbac";

const nav = [
  { href: "/admin", label: "Accueil", icon: LayoutDashboard },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/admin/trajets", label: "Trajets", icon: MapPin },
  { href: "/admin/vehicules", label: "Véhicules", icon: Car },
  { href: "/admin/reservations", label: "Réservations", icon: Calendar },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (profile && !canAccessAdminZone(profile.role)) {
      router.replace("/");
    }
  }, [loading, profile, router]);

  if (!loading && profile && !canAccessAdminZone(profile.role)) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col py-6">
          <div className="px-6 font-bold text-primary">
            SEN TRAJET · Admin
          </div>
          <nav className="mt-6 flex-1 space-y-1 px-3">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon className="h-5 w-5" /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="sticky top-0 z-30 border-b border-neutral-200 bg-white px-3 py-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
