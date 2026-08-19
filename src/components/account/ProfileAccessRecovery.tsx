"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";
import { Button } from "@/components/ui/Button";

export function ProfileAccessRecovery() {
  const router = useRouter();
  const { refreshProfile, signOut } = useAuth();
  const { t } = usePreferences();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    const recovered = await refreshProfile()?.catch(() => null);
    setRetrying(false);
    if (recovered) router.refresh();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void retry(), 1_500);
    return () => window.clearTimeout(timer);
    // Une seule tentative automatique, les suivantes restent manuelles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-background)] p-5">
      <section className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-lg)]">
        <RefreshCw className="mx-auto h-8 w-8 text-[var(--color-accent)]" />
        <h1 className="mt-4 text-xl font-black text-[var(--color-text-primary)]">
          {t("account.accessRecovery.title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {t("account.accessRecovery.description")}
        </p>
        <div className="mt-6 grid gap-3">
          <Button fullWidth isLoading={retrying} onClick={() => void retry()}>
            <RefreshCw className="h-4 w-4" />
            {t("account.accessRecovery.retry")}
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() =>
              void signOut().finally(() => router.replace("/connexion"))
            }
          >
            <LogOut className="h-4 w-4" />
            {t("actions.logout")}
          </Button>
        </div>
      </section>
    </main>
  );
}
