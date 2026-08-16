"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  platform: InstallPlatform;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
  update: () => Promise<"updated" | "unavailable">;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function detectsStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function detectsPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  if (/windows|macintosh|linux|cros/.test(userAgent)) return "desktop";
  return "unknown";
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("unknown");

  useEffect(() => {
    setIsInstalled(detectsStandalone());
    setPlatform(detectsPlatform());

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setPromptEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    if ("serviceWorker" in navigator && navigator.onLine) {
      void navigator.serviceWorker
        .getRegistration("/")
        .then((registration) => registration?.update())
        .catch(() => undefined);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return "unavailable" as const;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setIsInstalled(true);
    return choice.outcome;
  }, [promptEvent]);

  const update = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) {
      return "unavailable" as const;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      await registration?.update();
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });

      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("sen-trajet-"))
            .map((key) => window.caches.delete(key)),
        );
      }
      return "updated" as const;
    } catch {
      return "unavailable" as const;
    }
  }, []);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: Boolean(promptEvent),
      isInstalled,
      platform,
      install,
      update,
    }),
    [install, isInstalled, platform, promptEvent, update],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error("usePwaInstall must be used within PwaInstallProvider");
  return context;
}
