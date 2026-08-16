"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { assignableRoles, type AssignableRole } from "@/lib/accountRoles";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";
import type { TranslationKey } from "@/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  profileRole: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

type ResourceType = "driver" | "client" | "partner" | "asset_partner";

const roleLabelKeys: Record<AssignableRole, TranslationKey> = {
  super_admin: "admin.users.role.superAdmin",
  manager: "admin.users.role.manager",
  commercial: "admin.users.role.commercial",
  ops: "admin.users.role.ops",
  finance: "admin.users.role.finance",
  rh: "admin.users.role.hr",
  fleet_manager: "admin.users.role.fleetManager",
  driver: "admin.users.role.driver",
  partner: "admin.users.role.partner",
  provider: "admin.users.role.provider",
  asset_partner: "admin.users.role.assetPartner",
  client: "admin.users.role.client",
};

const creationErrorKeys: Partial<Record<string, TranslationKey>> = {
  email_already_exists: "admin.users.error.duplicate",
  invalid_email: "admin.users.error.invalidEmail",
  password_too_short: "admin.users.error.password",
  invalid_role: "admin.users.error.role",
  invalid_resource_link: "admin.users.error.resourceLink",
  authentication_required: "admin.users.error.session",
  invalid_session: "admin.users.error.session",
  super_admin_required: "admin.users.error.permission",
  account_management_not_configured: "admin.users.error.service",
  account_service_unavailable: "admin.users.error.service",
  user_creation_failed: "admin.users.error.auth",
  user_configuration_failed: "admin.users.error.configuration",
};

function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const random = new Uint32Array(14);
  crypto.getRandomValues(random);
  return `Sj!8${Array.from(random, (value) => alphabet[value % alphabet.length]).join("")}`;
}

export default function AdminUsersPage() {
  const { session, user } = useAuth();
  const { t, locale } = usePreferences();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AssignableRole>("client");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [resourceLink, setResourceLink] = useState<{
    type: ResourceType;
    id: string;
  } | null>(null);

  const authorization = useMemo(
    () =>
      session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    [session?.access_token],
  );

  const loadUsers = useCallback(async () => {
    if (!authorization) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        headers: authorization,
        cache: "no-store",
      });
      const data = (await response.json()) as {
        users?: ManagedUser[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users ?? []);
    } catch {
      setError(t("admin.users.error.load"));
    } finally {
      setLoading(false);
    }
  }, [authorization, t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get("role");
    const requestedName = params.get("name");
    const requestedEmail = params.get("email");
    const requestedResourceType = params.get("resourceType");
    const requestedResourceId = params.get("resourceId");
    if (requestedName) setFullName(requestedName);
    if (requestedEmail) setEmail(requestedEmail);
    if (
      requestedRole &&
      assignableRoles.includes(requestedRole as AssignableRole)
    ) {
      setRole(requestedRole as AssignableRole);
      setPassword(generateTemporaryPassword());
    }
    if (
      requestedResourceId &&
      ["driver", "client", "partner", "asset_partner"].includes(
        requestedResourceType ?? "",
      )
    ) {
      setResourceLink({
        type: requestedResourceType as ResourceType,
        id: requestedResourceId,
      });
    }
  }, []);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authorization) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    setCreatedCredentials(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { ...authorization, "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          resourceType: resourceLink?.type,
          resourceId: resourceLink?.id,
        }),
      });
      const data = (await response.json()) as {
        user?: ManagedUser;
        error?: string;
      };
      if (!response.ok || !data.user) {
        throw new Error(data.error || "user_creation_failed");
      }

      setUsers((current) => [data.user as ManagedUser, ...current]);
      setCreatedCredentials({ email, password });
      setMessage(t("admin.users.success.created"));
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("client");
      setResourceLink(null);
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : "";
      setError(t(creationErrorKeys[code] ?? "admin.users.error.create"));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (managedUser: ManagedUser) => {
    if (!authorization || !window.confirm(t("admin.users.confirmDelete"))) return;
    setDeletingId(managedUser.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { ...authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: managedUser.id }),
      });
      if (!response.ok) throw new Error();
      setUsers((current) => current.filter((entry) => entry.id !== managedUser.id));
      setMessage(t("admin.users.success.deleted"));
    } catch {
      setError(t("admin.users.error.delete"));
    } finally {
      setDeletingId(null);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(
      `${createdCredentials.email}\n${createdCredentials.password}`,
    );
    setMessage(t("admin.users.success.copied"));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          {t("admin.users.eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--color-text-primary)]">
          {t("admin.users.title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-secondary)]">
          {t("admin.users.subtitle")}
        </p>
      </div>

      {message ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--color-text-primary)]"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[var(--color-error)]/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--color-error)]"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card variant="elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold">{t("admin.users.createTitle")}</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t("admin.users.createHint")}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={createUser}>
            <Input
              label={t("admin.users.fullName")}
              name="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label={t("auth.email")}
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="off"
            />
            <div>
              <label
                htmlFor="new-user-role"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t("admin.users.role")}
              </label>
              <select
                id="new-user-role"
                name="role"
                className="input-base"
                value={role}
                onChange={(event) => setRole(event.target.value as AssignableRole)}
              >
                {assignableRoles.map((value) => (
                  <option key={value} value={value}>
                    {t(roleLabelKeys[value])}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("admin.users.temporaryPassword")}
              name="temporaryPassword"
              type="text"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText={t("admin.users.passwordHint")}
              required
              autoComplete="off"
            />
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setPassword(generateTemporaryPassword())}
            >
              {t("admin.users.generatePassword")}
            </Button>
            <Button type="submit" fullWidth isLoading={submitting}>
              <UserPlus className="h-4 w-4" />
              {t("admin.users.createAction")}
            </Button>
          </form>

          {createdCredentials ? (
            <div className="mt-5 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-4">
              <p className="text-sm font-bold">{t("admin.users.credentialsTitle")}</p>
              <p className="mt-2 break-all font-mono text-sm">{createdCredentials.email}</p>
              <p className="mt-1 break-all font-mono text-sm">
                {createdCredentials.password}
              </p>
              <Button className="mt-3" size="sm" onClick={() => void copyCredentials()}>
                <Copy className="h-4 w-4" />
                {t("admin.users.copyCredentials")}
              </Button>
            </div>
          ) : null}
        </Card>

        <Card variant="elevated">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold">{t("admin.users.listTitle")}</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("admin.users.listHint")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadUsers()}
              aria-label={t("admin.users.refresh")}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="space-y-2">
            {users.map((managedUser) => {
              const primaryRole = managedUser.roles[0] as AssignableRole | undefined;
              const isCurrent = managedUser.id === user?.id;
              const isSuperAdmin = managedUser.roles.includes("super_admin");
              return (
                <div
                  key={managedUser.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {managedUser.fullName || managedUser.email}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">
                      {managedUser.email}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-semibold text-[var(--color-accent)]">
                        {primaryRole && primaryRole in roleLabelKeys
                          ? t(roleLabelKeys[primaryRole])
                          : managedUser.profileRole ?? t("admin.users.role.client")}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          new Date(managedUser.createdAt),
                        )}
                      </span>
                    </div>
                  </div>
                  {!isCurrent && !isSuperAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={deletingId === managedUser.id}
                      onClick={() => void deleteUser(managedUser)}
                      aria-label={t("admin.users.delete")}
                      className="text-[var(--color-error)]"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("admin.users.delete")}
                    </Button>
                  ) : null}
                </div>
              );
            })}
            {!loading && users.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                {t("admin.users.empty")}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
