export type AppRole =
  | "client"
  | "driver"
  | "partner"
  | "admin"
  | "super_admin"
  | "commercial"
  | "trainer"
  | "regional_manager"
  | "partner_manager"
  | "partner_operator"
  | "rental_owner"
  /* ops schema SentraJet Premium */
  | "manager"
  | "ops"
  | "finance"
  | "rh"
  | "fleet_manager"
  | "provider"
  | "vehicle_owner"
  | "owner";

export const PLATFORM_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "commercial",
  "trainer",
  "regional_manager",
  "manager",
  "ops",
  "finance",
  "rh",
  "fleet_manager",
];

export const PARTNER_ROLES: AppRole[] = [
  "partner",
  "partner_manager",
  "partner_operator",
  "rental_owner",
  "provider",
];

/** Mappe les rôles du schéma ops (user_roles) vers les rôles app. */
export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  const map: Record<string, AppRole> = {
    super_admin: "super_admin",
    manager: "admin",
    commercial: "commercial",
    ops: "admin",
    finance: "admin",
    rh: "admin",
    fleet_manager: "admin",
    driver: "driver",
    partner: "partner",
    provider: "partner",
    client: "client",
    admin: "admin",
    trainer: "trainer",
    regional_manager: "regional_manager",
    partner_manager: "partner_manager",
    partner_operator: "partner_operator",
    rental_owner: "rental_owner",
  };
  return map[role] ?? (PLATFORM_ROLES.includes(role as AppRole) ? (role as AppRole) : null);
}

export function canAccessDriverZone(role: string | null | undefined): boolean {
  const r = normalizeRole(role) ?? role;
  return r === "driver" || r === "admin" || r === "super_admin";
}

export function canAccessPartnerZone(role: string | null | undefined): boolean {
  const r = normalizeRole(role) ?? role;
  return Boolean(r && PARTNER_ROLES.includes(r as AppRole)) || r === "super_admin";
}

export function canAccessAdminZone(role: string | null | undefined): boolean {
  const r = normalizeRole(role) ?? role;
  return Boolean(r && PLATFORM_ROLES.includes(r as AppRole));
}

export function canAccessOwnerZone(role: string | null | undefined): boolean {
  const r = normalizeRole(role) ?? role;
  return (
    r === "rental_owner" ||
    r === "vehicle_owner" ||
    r === "owner" ||
    r === "admin" ||
    r === "super_admin"
  );
}

/** Destination unique utilisée après connexion et dans tous les points d’entrée. */
export function workspaceForRole(role: string | null | undefined): string {
  const raw = role ?? "";
  const normalized = normalizeRole(raw);
  if (normalized && PLATFORM_ROLES.includes(normalized)) return "/admin";
  if (raw === "vehicle_owner" || raw === "owner") return "/proprietaire";
  if (
    normalized === "partner" ||
    raw === "partner_manager" ||
    raw === "partner_operator" ||
    raw === "rental_owner"
  ) {
    return "/partenaire";
  }
  if (normalized === "driver") return "/chauffeur";
  return "/compte";
}
