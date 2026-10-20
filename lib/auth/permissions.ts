import type { AdminRole } from "@/generated/prisma/enums"

/**
 * Who may do what in the admin panel. This is the single source of truth:
 * the server checks it on every admin request (server/auth/admin-session.ts),
 * and the admin UI uses it only to hide what the server would refuse anyway.
 *
 * To add a role: add it to the AdminRole enum in prisma/schema.prisma,
 * then give it a permission list below.
 */
export const permissions = [
  "dashboard.read",
  "enquiries.read",
  "enquiries.write",
  "enquiries.delete",
  "gallery.read",
  "gallery.write",
  "gallery.delete",
  "reviews.read",
  "reviews.moderate",
  "reviews.delete",
  "offers.read",
  "offers.write",
  "offers.delete",
  "announcements.read",
  "announcements.write",
  "announcements.delete",
  "content.read",
  "content.write",
  "destinations.read",
  "destinations.write",
  "destinations.delete",
  "services.read",
  "services.write",
  "services.delete",
  "traveller.read",
  "traveller.write",
  "fleet.read",
  "fleet.write",
  "fleet.delete",
  "users.read",
  "users.write",
  "settings.read",
  "settings.write",
  "audit.read",
] as const

export type Permission = (typeof permissions)[number]

export const adminRoles = ["SUPER_ADMIN", "CONTENT_ADMIN"] as const satisfies readonly AdminRole[]

/** Everything about running the system rather than the business. */
const systemPermissions: Permission[] = ["users.read", "users.write", "settings.read", "settings.write", "audit.read"]

const rolePermissions: Record<AdminRole, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set(permissions),
  CONTENT_ADMIN: new Set(permissions.filter((permission) => !systemPermissions.includes(permission))),
}

export function can(role: AdminRole, permission: Permission): boolean {
  return rolePermissions[role]?.has(permission) ?? false
}

export const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  CONTENT_ADMIN: "Content Admin",
}

export const roleDescriptions: Record<AdminRole, string> = {
  SUPER_ADMIN: "Everything, including admin users, settings and the activity log.",
  CONTENT_ADMIN: "Enquiries and all website content. No admin users, settings or system controls.",
}
