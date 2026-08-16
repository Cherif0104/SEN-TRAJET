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

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: Boolean(promptEvent),
      isInstalled,
      platform,
      install,
    }),
    [install, isInstalled, platform, promptEvent],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error("usePwaInstall must be used within PwaInstallProvider");
  return context;
}
