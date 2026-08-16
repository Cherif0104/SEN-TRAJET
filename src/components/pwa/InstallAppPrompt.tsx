"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";
import { usePreferences } from "@/providers/PreferencesProvider";
import { usePwaInstall } from "@/providers/PwaInstallProvider";

const DISMISSED_KEY = "sentrajet-install-prompt-dismissed";

export function InstallAppPrompt() {
  const { t } = usePreferences();
  const { canInstall, isInstalled, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  const requestInstall = async () => {
    await install();
    setDismissed(true);
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed || isInstalled || !canInstall) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-2xl md:bottom-6"
      aria-label={t("install.title")}
    >
      <Image
        src="/icons/app-icon-transparent-192.png"
        alt=""
        width={52}
        height={52}
        className="h-[52px] w-[52px] rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-[var(--color-text-primary)]">{t("install.title")}</p>
        <p className="text-xs leading-snug text-[var(--color-text-secondary)]">
          {t("install.description")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void requestInstall()}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-bold text-neutral-950 hover:bg-amber-400"
      >
        <Download className="h-4 w-4" />
        {t("actions.install")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"
        aria-label={t("common.close")}
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
