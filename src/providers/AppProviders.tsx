"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSplashScreen } from "@/components/brand/AppSplashScreen";
import { AuthProvider, useAuthContext } from "@/providers/AuthProvider";
import { PreferencesProvider, usePreferences } from "@/providers/PreferencesProvider";
import { PwaInstallProvider } from "@/providers/PwaInstallProvider";
import { workspaceForRole } from "@/lib/rbac";

const MINIMUM_SPLASH_DISPLAY_MS = 1_000;

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

  useEffect(() => {
    const timer = window.setTimeout(
      () => setMinimumDisplayElapsed(true),
      MINIMUM_SPLASH_DISPLAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minimumDisplayElapsed || !preferencesReady || authLoading) return;

    if (user && profile && (pathname === "/" || pathname === "/connexion")) {
      const destination =
        pathname === "/connexion"
          ? requestedInternalDestination() ?? workspaceForRole(profile.role, profile.internalRole)
          : workspaceForRole(profile.role, profile.internalRole);
      window.location.replace(destination);
      return;
    }

    setReady(true);
  }, [
    authLoading,
    minimumDisplayElapsed,
    pathname,
    preferencesReady,
    profile,
    user,
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
      {!ready ? <AppSplashScreen /> : null}
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
