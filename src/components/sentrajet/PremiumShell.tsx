"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, LogOut, UserRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/layout/Logo";
import {
  LanguageMenu,
  ThemeToggle,
} from "@/components/preferences/PreferenceControls";
import { usePreferences } from "@/providers/PreferencesProvider";
import type { TranslationKey } from "@/i18n";

export type PremiumNavItem = {
  href: string;
  label?: string;
  labelKey?: TranslationKey;
  icon: LucideIcon;
};

type PremiumShellProps = {
  title: string;
  subtitle?: string;
  nav: PremiumNavItem[];
  mobileNav?: PremiumNavItem[];
  children: React.ReactNode;
};

export function PremiumShell({ title, subtitle, nav, mobileNav, children }: PremiumShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { resolvedTheme, t } = usePreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bottom = (mobileNav ?? nav).slice(0, 4);
  const hasMore = nav.length > bottom.length;
  const profileHref =
    nav.find((item) => item.labelKey === "nav.profile")?.href ??
    nav.find((item) => item.labelKey === "nav.settings")?.href ??
    nav[0]?.href ??
    "/";
  const labelFor = (item: PremiumNavItem) =>
    item.labelKey ? t(item.labelKey) : item.label ?? "";

  const isActive = (href: string) =>
    href === pathname || (href !== nav[0]?.href && pathname.startsWith(href));

  const handleSignOut = async () => {
    await signOut();
    router.replace("/connexion");
    router.refresh();
  };

  return (
    <div className="sj-app">
      <aside className="sj-sidebar">
        <div className="sj-brand">
          <Logo variant={resolvedTheme === "dark" ? "light" : "default"} />
        </div>
        <nav className="sj-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
            <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : undefined}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{labelFor(item)}</span>
            </Link>
            );
          })}
        </nav>
        <div className="sj-side-bottom">
          <div className="sj-role-pill">
            {t("shell.workspace")} : <strong>{title}</strong>
            {subtitle ? <div className="sj-muted" style={{ marginTop: 4 }}>{subtitle}</div> : null}
            {profile?.full_name ? (
              <div className="sj-muted" style={{ marginTop: 6 }}>{profile.full_name}</div>
            ) : null}
          </div>
          <button type="button" className="sj-btn" style={{ width: "100%", marginTop: 10 }} onClick={() => void handleSignOut()}>
            {t("actions.logout")}
          </button>
        </div>
      </aside>

      <main className="sj-main">
        <header className="sj-topbar">
          <div className="min-w-0 flex-1 sm:hidden">
            <p className="truncate text-sm font-extrabold text-[var(--color-text-primary)]">
              {title}
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="sj-crumb">SentraJet Premium / {title}</div>
          </div>
          <div className="sj-top-actions">
            <LanguageMenu />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-error)] transition hover:border-[var(--color-error)] hover:bg-[var(--color-surface-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              aria-label={t("actions.logout")}
              title={t("actions.logout")}
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
            <details className="group relative">
              <summary
                className="sj-avatar cursor-pointer list-none focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                aria-label={t("nav.profile")}
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full rounded-[inherit] object-cover"
                  />
                ) : (
                  (profile?.full_name?.[0] || title[0] || "S").toUpperCase()
                )}
              </summary>
              <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 shadow-[var(--shadow-lg)]">
                <div className="border-b border-[var(--color-border)] px-3 py-2">
                  <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                    {profile?.full_name || title}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
                </div>
                <Link
                  href={profileHref}
                  className="mt-1 flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                >
                  <UserRound className="h-4 w-4" />
                  {t("nav.profile")}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--color-error)] hover:bg-[var(--color-surface-secondary)]"
                >
                  <LogOut className="h-4 w-4" />
                  {t("actions.logout")}
                </button>
              </div>
            </details>
          </div>
        </header>
        <div className="sj-content">{children}</div>
        <nav className="sj-mobile-nav">
          {bottom.map((item) => {
            const Icon = item.icon;
            return (
            <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : undefined}>
              <Icon className="mx-auto h-4 w-4" />
              <small title={labelFor(item)}>{labelFor(item)}</small>
            </Link>
            );
          })}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="min-w-0 flex-1 bg-transparent p-2 text-center text-[var(--color-text-secondary)]"
              aria-expanded={mobileMenuOpen}
            >
              <LayoutGrid className="mx-auto h-4 w-4" />
              <small>{t("common.more")}</small>
            </button>
          ) : null}
        </nav>
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--color-background)] md:hidden">
            <div className="flex min-h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  SentraJet Premium
                </p>
                <p className="font-bold text-[var(--color-text-primary)]">{title}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)]"
                aria-label={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-24 flex-col justify-between rounded-2xl border p-4 ${
                      isActive(item.href)
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-bold">{labelFor(item)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <LanguageMenu />
                  <ThemeToggle />
                </div>
                <Link
                  href={profileHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold"
                >
                  <UserRound className="h-4 w-4" />
                  {t("nav.profile")}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-error)] font-bold text-[var(--color-error)]"
              >
                <LogOut className="h-4 w-4" />
                {t("actions.logout")}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export function SjBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "info" | "danger";
  children: React.ReactNode;
}) {
  return <span className={`sj-badge ${tone}`}>{children}</span>;
}

export function SjCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`sj-card ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function SjSectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sj-section-head">
      <div>
        {eyebrow ? <div className="sj-eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
