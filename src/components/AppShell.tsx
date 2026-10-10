"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CarFront, History, Home, LogOut, Package, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationBell } from "@/components/NotificationBell";

const clientNav = [
  { href: "/app", label: "Accueil", icon: Home },
  { href: "/ride?service=ride", label: "Course", icon: CarFront },
  { href: "/ride?service=delivery", label: "Livraison", icon: Package },
  { href: "/history", label: "Activité", icon: History }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function logout() {
    await signOut();
    router.replace("/");
  }

  return (
    <main className="mobile-screen" style={{ paddingBottom: 88 }}>
      <header className="app-header">
        <BrandLogo compact />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <NotificationBell />
          <button type="button" onClick={() => void logout()} aria-label="Déconnexion" style={{ width: 40, height: 40, border: 0, borderRadius: 14, background: "white", color: "var(--muted)", display: "grid", placeItems: "center" }}>
            <LogOut size={18} />
          </button>
          <Link href="/profile" className="avatar">
            {profile?.full_name?.[0]?.toUpperCase() || <UserRound size={19} />}
          </Link>
        </div>
      </header>
      {children}
      <nav className="bottom-nav">
        {clientNav.map(({ href, label, icon: Icon }) => {
          const path = href.split("?")[0];
          const active = path === "/app" ? pathname === "/app" : pathname.startsWith(path);
          return (
            <Link key={href} href={href} className={active ? "active" : ""}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
