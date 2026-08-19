"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, ShieldCheck, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/profiles";
import { supabase } from "@/lib/supabase";
import { usePreferences } from "@/providers/PreferencesProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AccountAvatarUploader } from "@/components/account/AccountAvatarUploader";

type Props = {
  roleLabel: string;
  canManageUsers?: boolean;
};

export function AccountProfilePanel({ roleLabel, canManageUsers = false }: Props) {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { t } = usePreferences();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
  }, [profile]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      await refreshProfile?.();
      setMessage(t("account.profileSaved"));
    } catch {
      setError(t("account.profileError"));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (newPassword.length < 12) {
      setError(t("account.passwordLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("account.passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (passwordError) throw passwordError;
      setNewPassword("");
      setConfirmPassword("");
      setMessage(t("account.passwordSaved"));
    } catch {
      setError(t("account.passwordError"));
    } finally {
      setSavingPassword(false);
    }
  };

  const logout = async () => {
    await signOut();
    router.replace("/connexion");
    router.refresh();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card variant="elevated">
        <AccountAvatarUploader />
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">{t("account.identityTitle")}</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("account.identityHint")}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={saveProfile}>
          <Input
            label={t("admin.users.fullName")}
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label={t("auth.phone")}
            name="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
          <Input label={t("auth.email")} value={user?.email ?? ""} disabled />
          <Input label={t("admin.users.role")} value={roleLabel} disabled />
          <Button type="submit" fullWidth isLoading={savingProfile}>
            {t("common.save")}
          </Button>
        </form>
      </Card>

      <Card variant="elevated">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">{t("account.securityTitle")}</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("account.securityHint")}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={savePassword}>
          <Input
            label={t("account.newPassword")}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={12}
            autoComplete="new-password"
          />
          <Input
            label={t("account.confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={12}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="secondary"
            fullWidth
            isLoading={savingPassword}
            disabled={!newPassword || !confirmPassword}
          >
            {t("account.changePassword")}
          </Button>
        </form>

        <div className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-5">
          {canManageUsers ? (
            <Button href="/admin/utilisateurs" fullWidth>
              <UsersRound className="h-4 w-4" />
              {t("admin.users.title")}
            </Button>
          ) : null}
          <Button variant="ghost" fullWidth onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            {t("actions.logout")}
          </Button>
        </div>
      </Card>

      {message ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--color-text-primary)] xl:col-span-2"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[var(--color-error)]/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--color-error)] xl:col-span-2"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
