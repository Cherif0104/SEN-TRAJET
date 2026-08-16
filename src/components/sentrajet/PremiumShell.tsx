"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/layout/Logo";
import { PreferencesMenu } from "@/components/preferences/PreferencesMenu";
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
  const { profile, signOut } = useAuth();
  const { resolvedTheme, t } = usePreferences();
  const bottom = mobileNav ?? nav.slice(0, 4);
  const labelFor = (item: PremiumNavItem) =>
    item.labelKey ? t(item.labelKey) : item.label ?? "";

  const isActive = (href: string) =>
    href === pathname || (href !== nav[0]?.href && pathname.startsWith(href));

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
          <button type="button" className="sj-btn" style={{ width: "100%", marginTop: 10 }} onClick={() => void signOut()}>
            {t("actions.logout")}
          </button>
        </div>
      </aside>

      <main className="sj-main">
        <header className="sj-topbar">
          <div>
            <div className="sj-crumb">SentraJet Premium / {title}</div>
          </div>
          <div className="sj-top-actions">
            <PreferencesMenu />
            <div className="sj-avatar">{(profile?.full_name?.[0] || title[0] || "S").toUpperCase()}</div>
          </div>
        </header>
        <div className="sj-content">{children}</div>
        <nav className="sj-mobile-nav">
          {bottom.map((item) => {
            const Icon = item.icon;
            return (
            <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : undefined}>
              <Icon className="mx-auto h-4 w-4" />
              <small>{labelFor(item).split(" ")[0]}</small>
            </Link>
            );
          })}
        </nav>
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
