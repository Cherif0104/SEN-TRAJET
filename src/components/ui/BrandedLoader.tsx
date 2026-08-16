"use client";

import { usePreferences } from "@/providers/PreferencesProvider";

export function BrandedLoader({
  label,
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const { t } = usePreferences();

  return (
    <div
      className={`grid place-items-center ${
        fullScreen ? "min-h-screen bg-[var(--color-background)]" : "min-h-32"
      }`}
      role="status"
    >
      <div className="grid justify-items-center gap-3 text-center">
        <span className="sj-loader-ring !h-9 !w-9 !border-[6px]" aria-hidden="true" />
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {label ?? t("common.loading")}
        </span>
      </div>
    </div>
  );
}
