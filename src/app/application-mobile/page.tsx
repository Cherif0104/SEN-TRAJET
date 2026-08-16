"use client";

import Image from "next/image";
import { CheckCircle2, Download, MoreVertical, Share2, Smartphone } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePreferences } from "@/providers/PreferencesProvider";
import { usePwaInstall } from "@/providers/PwaInstallProvider";

export default function MobileAppPage() {
  const { t } = usePreferences();
  const { canInstall, install, isInstalled, platform } = usePwaInstall();

  const instruction =
    platform === "ios"
      ? t("mobileApp.iosInstruction")
      : platform === "android"
        ? t("mobileApp.androidInstruction")
        : t("mobileApp.desktopInstruction");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-soft),transparent_48%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                {t("mobileApp.eyebrow")}
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
                {t("mobileApp.title")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
                {t("mobileApp.subtitle")}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {isInstalled ? (
                  <div className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500/10 px-5 font-semibold text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    {t("mobileApp.installed")}
                  </div>
                ) : canInstall ? (
                  <Button size="lg" onClick={() => void install()}>
                    <Download className="h-5 w-5" />
                    {t("mobileApp.installAction")}
                  </Button>
                ) : (
                  <div className="max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    {instruction}
                  </div>
                )}
                <Button variant="secondary" size="lg" href="/reserver">
                  {t("actions.bookNow")}
                </Button>
              </div>

              <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                {t("mobileApp.noStore")}
              </p>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-[2.5rem] border border-[var(--color-border-strong)] bg-[#07111f] p-3 shadow-[var(--shadow-xl)]">
                <div className="overflow-hidden rounded-[2rem] bg-[var(--color-surface)]">
                  <div className="flex min-h-[510px] flex-col items-center justify-center px-7 py-12 text-center">
                    <Image
                      src="/icons/app-icon-transparent-192.png"
                      alt=""
                      width={112}
                      height={112}
                      className="h-28 w-28 rounded-[1.6rem] shadow-[var(--shadow-lg)]"
                    />
                    <h2 className="mt-7 text-2xl font-extrabold text-[var(--color-text-primary)]">
                      SentraJet Premium
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {t("mobileApp.sameExperience")}
                    </p>
                    <div className="mt-8 grid w-full grid-cols-3 gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                      <span className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                        {t("mobileApp.featureBooking")}
                      </span>
                      <span className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                        {t("mobileApp.featureTracking")}
                      </span>
                      <span className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                        {t("mobileApp.featureAccounts")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <Smartphone className="mx-auto h-9 w-9 text-[var(--color-accent)]" />
              <h2 className="mt-3 text-2xl font-extrabold text-[var(--color-text-primary)]">
                {t("mobileApp.manualTitle")}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {t("mobileApp.manualSubtitle")}
              </p>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <Card>
                <Share2 className="h-6 w-6 text-[var(--color-accent)]" />
                <h3 className="mt-3 font-bold">{t("mobileApp.iosTitle")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {t("mobileApp.iosSteps")}
                </p>
              </Card>
              <Card>
                <MoreVertical className="h-6 w-6 text-[var(--color-accent)]" />
                <h3 className="mt-3 font-bold">{t("mobileApp.androidTitle")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {t("mobileApp.androidSteps")}
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
