"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSplashScreen } from "@/components/brand/AppSplashScreen";
import { ONBOARDING_SEEN_KEY, WelcomeOnboarding } from "@/components/brand/WelcomeOnboarding";
import { AuthProvider, useAuthContext } from "@/providers/AuthProvider";
import { PreferencesProvider, usePreferences } from "@/providers/PreferencesProvider";
import { PwaInstallProvider } from "@/providers/PwaInstallProvider";
import { workspaceForRole } from "@/lib/rbac";

const MINIMUM_SPLASH_DISPLAY_MS = 1_000;
const CLIENT_SERVICE_PREFIXES = [
  "/course",
  "/taxi-aeroport",
  "/flotte",
  "/reserver",
  "/interurbain",
  "/voyager",
  "/mon-chauffeur",
  "/allo-dakar",
  "/destinations",
];

function requiresClientAccount(pathname: string): boolean {
  return CLIENT_SERVICE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function requestedInternalDestination(): string | null {
  const candidate = new URLSearchParams(window.location.search).get("next");
  return candidate && candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : null;
}

function BootstrapGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready: preferencesReady } = usePreferences();
  const { loading: authLoading, user, profile } = useAuthContext();
  const [ready, setReady] = useState(false);
  const [minimumDisplayElapsed, setMinimumDisplayElapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setMinimumDisplayElapsed(true),
      MINIMUM_SPLASH_DISPLAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minimumDisplayElapsed || !preferencesReady || authLoading) return;

    if (!user && requiresClientAccount(pathname)) {
      const requested = `${pathname}${window.location.search}`;
      window.location.replace(`/connexion?next=${encodeURIComponent(requested)}`);
      return;
    }

    if (user && profile && (pathname === "/" || pathname === "/connexion")) {
      const destination =
        pathname === "/connexion"
          ? requestedInternalDestination() ?? workspaceForRole(profile.role, profile.internalRole)
          : workspaceForRole(profile.role, profile.internalRole);
      window.location.replace(destination);
      return;
    }

    // Première visite (jamais connecté, jamais vu l'écran de bienvenue) sur l'accueil : on
    // propose l'onboarding interactif (logo → « Avez-vous déjà un compte ? ») avant d'afficher
    // la page. Une fois vu (ou passé), ne se réaffiche plus jamais sur cet appareil.
    if (!user && pathname === "/" && !showWelcome) {
      let seen = false;
      try {
        seen = window.localStorage.getItem(ONBOARDING_SEEN_KEY) === "1";
      } catch {
        seen = true;
      }
      if (!seen) {
        setShowWelcome(true);
        return;
      }
    }

    setReady(true);
  }, [
    authLoading,
    minimumDisplayElapsed,
    pathname,
    preferencesReady,
    profile,
    user,
    showWelcome,
  ]);

  useEffect(() => {
    if (ready) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ready]);

  return (
    <>
      <div aria-hidden={!ready}>{children}</div>
      {showWelcome ? (
        <WelcomeOnboarding
          onDismiss={() => {
            setShowWelcome(false);
            setReady(true);
          }}
        />
      ) : !ready ? (
        <AppSplashScreen />
      ) : null}
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <PwaInstallProvider>
        <AuthProvider>
          <BootstrapGate>{children}</BootstrapGate>
        </AuthProvider>
      </PwaInstallProvider>
    </PreferencesProvider>
  );
}
