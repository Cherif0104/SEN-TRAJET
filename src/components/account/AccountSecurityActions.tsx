"use client";

import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { usePreferences } from "@/providers/PreferencesProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function AccountSecurityActions() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { t } = usePreferences();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 12 || password !== confirmation) {
      setFeedback(
        password !== confirmation
          ? t("account.passwordMismatch")
          : t("account.passwordLength"),
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    setFeedback(error ? t("account.passwordError") : t("account.passwordSaved"));
    if (!error) {
      setPassword("");
      setConfirmation("");
    }
  };

  const logout = async () => {
    await signOut();
    router.replace("/connexion");
    router.refresh();
  };

  return (
    <Card className="mt-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-[var(--color-accent)]" />
        <h2 className="font-bold">{t("account.securityTitle")}</h2>
      </div>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <Input
          label={t("account.newPassword")}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <Input
          label={t("account.confirmPassword")}
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
        />
        <Button type="submit" isLoading={saving} disabled={!password || !confirmation}>
          {t("account.changePassword")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          {t("actions.logout")}
        </Button>
      </form>
      {feedback ? <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{feedback}</p> : null}
    </Card>
  );
}
