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
  | "rental_owner";

export const PLATFORM_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "commercial",
  "trainer",
  "regional_manager",
];

export const PARTNER_ROLES: AppRole[] = ["partner", "partner_manager", "partner_operator", "rental_owner"];

export function canAccessDriverZone(role: string | null | undefined): boolean {
  return role === "driver" || role === "admin" || role === "super_admin";
}

export function canAccessPartnerZone(role: string | null | undefined): boolean {
  return Boolean(role && PARTNER_ROLES.includes(role as AppRole)) || role === "super_admin";
}

export function canAccessAdminZone(role: string | null | undefined): boolean {
  return Boolean(role && PLATFORM_ROLES.includes(role as AppRole));
}

