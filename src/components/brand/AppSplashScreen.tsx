"use client";

import Image from "next/image";
import { Armchair, Clock3, Headphones, ShieldCheck } from "lucide-react";
import { usePreferences } from "@/providers/PreferencesProvider";

const reassurance = [
  {
    icon: ShieldCheck,
    title: "splash.security" as const,
    detail: "splash.securityDetail" as const,
  },
  {
    icon: Clock3,
    title: "splash.punctuality" as const,
    detail: "splash.punctualityDetail" as const,
  },
  {
    icon: Armchair,
    title: "splash.comfort" as const,
    detail: "splash.comfortDetail" as const,
  },
  {
    icon: Headphones,
    title: "splash.support" as const,
    detail: "splash.supportDetail" as const,
  },
];

export function AppSplashScreen() {
  const { t } = usePreferences();

  return (
    <div className="sj-splash" role="status" aria-live="polite">
      <div className="sj-splash-glow" aria-hidden="true" />
      <div className="sj-splash-content">
        <div className="sj-splash-brand">
          <Image
            src="/brand/sentrajet-mark-transparent.svg"
            width={156}
            height={156}
            priority
            unoptimized
            alt=""
            className="sj-splash-mark"
          />
          <div className="sj-splash-wordmark" aria-label="SentraJet Premium">
            <strong>SENTRA<span>JET</span></strong>
            <small><i />PREMIUM<i /></small>
          </div>
          <p>{t("splash.tagline")}</p>
          <p className="sj-splash-tagline-secondary">
            {t("splash.taglineSecond")}
          </p>
        </div>

        <div className="sj-splash-landscape" aria-hidden="true">
          <svg viewBox="0 0 720 180" preserveAspectRatio="none">
            <path
              className="sj-splash-skyline"
              d="M0 141h32v-18h14V92h8v31h28v-33h10v33h14v-52h8v52h30V105h13v18h16v-42h11v42h28V96h14v27h24V52h10v71h28v-38h14v38h31v-69h16v69h24v-91h18v91h29V72h12v51h24v-45h14v45h28v-62h16v62h22v-26h14v26h26v-57h17v57h26v-32h14v32h25v-80h17v80h28v18H0z"
            />
            <path
              className="sj-splash-road"
              d="M347 180C391 151 443 137 720 132M350 180C320 153 287 140 0 134M357 180C374 155 403 144 569 137"
            />
          </svg>
        </div>

        <div className="sj-splash-loading">
          <span className="sj-loader-ring" aria-hidden="true" />
          <strong>{t("splash.initializing")}</strong>
        </div>

        <div className="sj-splash-reassurance">
          {reassurance.map(({ icon: Icon, title, detail }) => (
            <div key={title}>
              <Icon aria-hidden="true" />
              <strong>{t(title)}</strong>
              <small>{t(detail)}</small>
            </div>
          ))}
        </div>
        <p className="sj-splash-thanks">{t("splash.thanks")}</p>
      </div>
    </div>
  );
}
