"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { PreferencesMenu } from "@/components/preferences/PreferencesMenu";
import { usePreferences } from "@/providers/PreferencesProvider";
import { workspaceForRole } from "@/lib/rbac";

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const { resolvedTheme, t } = usePreferences();

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    router.replace("/connexion");
    router.refresh();
  };

  const isLoggedIn = !!user;
  const hubHref = workspaceForRole(profile?.role);
  const hubLabel = hubHref === "/admin"
    ? t("nav.administration")
    : hubHref === "/proprietaire"
      ? t("nav.owner")
      : hubHref === "/partenaire"
        ? t("nav.partner")
        : hubHref === "/chauffeur"
          ? t("nav.missions")
          : t("nav.account");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3 sm:px-5 lg:px-7">
        <Logo variant={resolvedTheme === "dark" ? "light" : "default"} />

        <nav className="hidden md:flex md:items-center md:gap-8">
          <Link href="/application-mobile" className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">
            {t("nav.mobileApp")}
          </Link>
          {isLoggedIn ? (
            <Link href={hubHref} className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
              {hubLabel}
            </Link>
          ) : (
            <Link href="/faq" className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">
              {t("nav.help")}
            </Link>
          )}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2">
          <PreferencesMenu />
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-[var(--color-surface-secondary)]" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <NotificationBell userId={user.id} />
              <Link
                href={hubHref}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                title={t("actions.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" href="/connexion">
                {t("actions.login")}
              </Button>
              <Button variant="primary" size="sm" href="/reserver" className="bg-amber-500 text-neutral-900 hover:bg-amber-400">
                {t("nav.book")}
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={t("header.menu")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <div className="mb-2 flex justify-end">
              <PreferencesMenu compact />
            </div>
            <Link href="/reserver" className="rounded-lg px-3 py-2.5 font-semibold text-[var(--color-text-primary)]" onClick={() => setMenuOpen(false)}>
              {t("nav.book")}
            </Link>
            <Link href="/application-mobile" className="rounded-lg px-3 py-2 text-[var(--color-text-secondary)]" onClick={() => setMenuOpen(false)}>
              {t("nav.mobileApp")}
            </Link>
            {isLoggedIn ? (
              <Link href={hubHref} className="rounded-lg px-3 py-2 font-medium text-[var(--color-text-primary)]" onClick={() => setMenuOpen(false)}>
                {hubLabel}
              </Link>
            ) : (
              <Link href="/faq" className="rounded-lg px-3 py-2 text-[var(--color-text-secondary)]" onClick={() => setMenuOpen(false)}>
                {t("nav.help")}
              </Link>
            )}
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3">
              {user ? (
                <Button variant="secondary" fullWidth onClick={() => void handleSignOut()}>
                  {t("actions.logout")}
                </Button>
              ) : (
                <>
                  <Button variant="secondary" fullWidth href="/connexion" onClick={() => setMenuOpen(false)}>
                    {t("actions.login")}
                  </Button>
                  <Button variant="primary" fullWidth href="/reserver" onClick={() => setMenuOpen(false)}>
                    {t("nav.book")}
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
