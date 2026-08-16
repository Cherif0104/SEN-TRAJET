"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "sentrajet-install-prompt-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem(DISMISSED_KEY) === "true") return;

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setHidden(false);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setHidden(true);
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setHidden(true);
  };

  if (hidden || !installPrompt) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-200 bg-white p-3 shadow-2xl md:bottom-6"
      aria-label="Installer l’application SentraJet"
    >
      <Image
        src="/icons/app-icon-192.png"
        alt=""
        width={52}
        height={52}
        className="h-[52px] w-[52px] rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-neutral-950">Installer SentraJet</p>
        <p className="text-xs leading-snug text-neutral-600">
          Ajoutez l’application à votre écran d’accueil.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-bold text-neutral-950 hover:bg-amber-400"
      >
        <Download className="h-4 w-4" />
        Installer
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
