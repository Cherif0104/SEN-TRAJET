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
