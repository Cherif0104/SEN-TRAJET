"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();

  const isDriver = profile?.role === "driver";
  const isPartner = ["partner", "partner_manager", "partner_operator", "rental_owner"].includes(profile?.role ?? "");
  const isAdmin = ["admin", "super_admin", "commercial", "trainer", "regional_manager"].includes(profile?.role ?? "");
  const isClient = user && !isDriver && !isPartner && !isAdmin;
  const isLoggedIn = !!user;

  const hubHref = isAdmin ? "/admin" : isPartner ? "/partenaire" : isDriver ? "/chauffeur" : "/compte";
  const hubLabel = isAdmin ? "Administration" : isPartner ? "Mon espace" : isDriver ? "Tableau de bord" : "Mon compte";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-[3.25rem] max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden md:flex md:items-center md:gap-8">
          {isLoggedIn ? (
            <>
              <Link
                href={hubHref}
                className="text-sm font-semibold text-neutral-900 hover:text-emerald-700"
              >
                {hubLabel}
              </Link>
              <Link
                href="/recherche"
                className="text-sm font-medium text-neutral-600 hover:text-emerald-700"
              >
                Recherche
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/recherche"
                className="text-sm font-medium text-neutral-600 hover:text-emerald-700"
              >
                Recherche
              </Link>
              <Link
                href="/demande"
                className="text-sm font-medium text-neutral-600 hover:text-emerald-700"
              >
                Demander un trajet
              </Link>
              <Link
                href="/inscription"
                className="text-sm font-medium text-neutral-600 hover:text-emerald-700"
              >
                Chauffeur / Pro
              </Link>
            </>
          )}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-200" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <NotificationBell userId={user.id} />
              <Link
                href={isAdmin ? "/admin" : isPartner ? "/partenaire/profil" : isDriver ? "/chauffeur/profil" : "/compte"}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-primary"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <span className="max-w-[100px] truncate">
                  {profile?.full_name || user.email?.split("@")[0]}
                </span>
              </Link>
              <button
                onClick={signOut}
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
              <Button
                variant="primary"
                size="sm"
                href="/inscription"
                className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              >
                S&apos;inscrire
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {isLoggedIn ? (
              <>
                <Link
                  href={hubHref}
                  className="rounded-lg px-3 py-2.5 font-medium text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {hubLabel}
                </Link>
                <Link
                  href="/recherche"
                  className="rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Recherche
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/recherche"
                  className="rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Recherche
                </Link>
                <Link
                  href="/demande"
                  className="rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Demander un trajet
                </Link>
                <Link
                  href="/inscription"
                  className="rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Chauffeur / Pro
                </Link>
              </>
            )}
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-neutral-700">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                  >
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    fullWidth
                    href="/connexion"
                    onClick={() => setMenuOpen(false)}
                  >
                    Se connecter
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    href="/inscription"
                    onClick={() => setMenuOpen(false)}
                  >
                    S&apos;inscrire
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
