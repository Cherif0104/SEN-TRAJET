"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const isDriver = profile?.role === "driver";
  const isPartner = ["partner", "partner_manager", "partner_operator", "rental_owner", "provider"].includes(
    profile?.role ?? ""
  );
  const isAdmin = [
    "admin",
    "super_admin",
    "commercial",
    "trainer",
    "regional_manager",
    "manager",
    "ops",
    "finance",
    "fleet_manager",
  ].includes(profile?.role ?? "");
  const isOwner = profile?.role === "rental_owner";
  const isLoggedIn = !!user;

  const hubHref = isAdmin
    ? "/admin"
    : isPartner
      ? "/partenaire"
      : isDriver
        ? "/chauffeur"
        : isOwner
          ? "/proprietaire"
          : "/compte";
  const hubLabel = isAdmin
    ? "Administration"
    : isPartner
      ? "Espace partenaire"
      : isDriver
        ? "Missions"
        : isOwner
          ? "Espace propriétaire"
          : "Mon compte";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3 sm:px-5 lg:px-7">
        <Logo />

        <nav className="hidden md:flex md:items-center md:gap-8">
          {isLoggedIn ? (
            <Link href={hubHref} className="text-sm font-semibold text-neutral-900 hover:text-amber-700">
              {hubLabel}
            </Link>
          ) : (
            <Link href="/faq" className="text-sm font-medium text-neutral-600 hover:text-amber-700">
              Aide
            </Link>
          )}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-200" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <NotificationBell userId={user.id} />
              <Link
                href={hubHref}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                  <User className="h-4 w-4" />
                </div>
                <span className="max-w-[100px] truncate">
                  {profile?.full_name || user.email?.split("@")[0]}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" href="/connexion" className="text-neutral-700">
                Connexion
              </Button>
              <Button variant="primary" size="sm" href="/reserver" className="bg-amber-500 text-neutral-900 hover:bg-amber-400">
                Réserver
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link href="/reserver" className="rounded-lg px-3 py-2.5 font-semibold text-neutral-900" onClick={() => setMenuOpen(false)}>
              Réserver
            </Link>
            {isLoggedIn ? (
              <Link href={hubHref} className="rounded-lg px-3 py-2 font-medium text-neutral-700" onClick={() => setMenuOpen(false)}>
                {hubLabel}
              </Link>
            ) : (
              <Link href="/faq" className="rounded-lg px-3 py-2 text-neutral-700" onClick={() => setMenuOpen(false)}>
                Aide
              </Link>
            )}
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3">
              {user ? (
                <Button variant="secondary" fullWidth onClick={() => void handleSignOut()}>
                  Déconnexion
                </Button>
              ) : (
                <>
                  <Button variant="secondary" fullWidth href="/connexion" onClick={() => setMenuOpen(false)}>
                    Se connecter
                  </Button>
                  <Button variant="primary" fullWidth href="/reserver" onClick={() => setMenuOpen(false)}>
                    Réserver
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
