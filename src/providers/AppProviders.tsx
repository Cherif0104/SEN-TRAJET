"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSplashScreen } from "@/components/brand/AppSplashScreen";
import { AuthProvider, useAuthContext, type Profile } from "@/providers/AuthProvider";
import { PreferencesProvider, usePreferences } from "@/providers/PreferencesProvider";

const MINIMUM_SPLASH_DISPLAY_MS = 1_000;

function destinationForRole(role: Profile["role"]): string {
  if (role === "client") return "/compte";
  if (role === "driver") return "/chauffeur";
  if (role === "vehicle_owner" || role === "owner") return "/proprietaire";
  if (
    role === "partner" ||
    role === "partner_manager" ||
    role === "partner_operator" ||
    role === "rental_owner"
  ) {
    return "/partenaire";
  }
  return "/admin";
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
          ? requestedInternalDestination() ?? destinationForRole(profile.role)
          : destinationForRole(profile.role);
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
      <AuthProvider>
        <BootstrapGate>{children}</BootstrapGate>
      </AuthProvider>
    </PreferencesProvider>
  );
}
