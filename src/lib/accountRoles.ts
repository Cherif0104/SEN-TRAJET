export const assignableRoles = [
  "super_admin",
  "manager",
  "commercial",
  "ops",
  "finance",
  "rh",
  "fleet_manager",
  "driver",
  "partner",
  "provider",
  "asset_partner",
  "client",
] as const;

export type AssignableRole = (typeof assignableRoles)[number];

export function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    assignableRoles.includes(value as AssignableRole)
  );
}

export function profileRoleFor(role: AssignableRole): string {
  if (
    role === "manager" ||
    role === "ops" ||
    role === "finance" ||
    role === "rh" ||
    role === "fleet_manager"
  ) {
    return "admin";
  }
  if (role === "provider") return "partner";
  return role;
}

/**
 * Regroupement visuel des rôles granulaires sous les 4 types de comptes conceptuels
 * (Client / Gestionnaire-Administrateur / Chauffeur / Partenaire). Purement présentationnel —
 * ne change rien au RBAC existant (`rbac.ts`, `profileRoleFor`) : un super administrateur garde
 * la possibilité de choisir un rôle précis à l'intérieur de son groupe (ex. "Finance" dans
 * "Gestion / Administration") pour la navigation et les permissions internes.
 */
export const ROLE_GROUP_KEYS = ["client", "gestion", "chauffeur", "partenaire"] as const;
export type RoleGroupKey = (typeof ROLE_GROUP_KEYS)[number];

export const ROLE_GROUP_LABELS: Record<RoleGroupKey, string> = {
  client: "Client",
  gestion: "Gestion / Administration",
  chauffeur: "Chauffeur",
  partenaire: "Partenaire",
};

export const ROLE_GROUP_FOR: Record<AssignableRole, RoleGroupKey> = {
  client: "client",
  super_admin: "gestion",
  manager: "gestion",
  commercial: "gestion",
  ops: "gestion",
  finance: "gestion",
  rh: "gestion",
  fleet_manager: "gestion",
  driver: "chauffeur",
  partner: "partenaire",
  provider: "partenaire",
  asset_partner: "partenaire",
};

export function rolesByGroup(): Array<{ group: RoleGroupKey; roles: AssignableRole[] }> {
  return ROLE_GROUP_KEYS.map((group) => ({
    group,
    roles: assignableRoles.filter((role) => ROLE_GROUP_FOR[role] === group),
  }));
}
