"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/profiles";
import { uploadProfileAvatar } from "@/lib/storage";
import { usePreferences } from "@/providers/PreferencesProvider";

export function AccountAvatarUploader() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = usePreferences();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    setSaving(true);
    setError(null);
    try {
      const avatarUrl = await uploadProfileAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: avatarUrl });
      await refreshProfile?.();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : t("account.avatarError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, { avatar_url: null });
      await refreshProfile?.();
    } catch {
      setError(t("account.avatarError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-8 w-8" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[var(--color-text-primary)]">
          {t("account.avatarTitle")}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {t("account.avatarHint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={upload}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-3 text-sm font-bold text-[var(--color-accent-contrast)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {t("account.avatarChange")}
          </button>
          {profile?.avatar_url ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--color-error)]"
            >
              <Trash2 className="h-4 w-4" />
              {t("account.avatarRemove")}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p> : null}
      </div>
    </div>
  );
}
