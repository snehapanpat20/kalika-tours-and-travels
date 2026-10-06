import "server-only"
import { cache } from "react"
import { forbidden, redirect } from "next/navigation"
import { can } from "@/lib/auth/permissions"
import { getSignedInAdmin, type AdminAccess, type AdminProfile } from "@/server/auth/admin-session"

/** One session check per request, shared by the admin layout and its pages. */
export const getAdminForPage = cache(getSignedInAdmin)

/**
 * For admin pages: returns the signed-in admin, or
 * - redirects to the login page when signed out,
 * - sends an admin who must change their password to their account page,
 * - shows the 403 page (status 403) when their role lacks the permission.
 * Pages call this themselves (not only the layout) because Next.js renders
 * layouts and pages in parallel, so each data-loading page must check access.
 */
export async function requireAdminPage(returnTo: string, access: AdminAccess): Promise<AdminProfile> {
  const admin = await getAdminForPage()
  if (!admin) redirect(`/admin/login?next=${encodeURIComponent(returnTo)}`)
  if (access === "self") return admin
  if (admin.mustChangePassword) redirect("/admin/account?setup=1")
  if (!can(admin.role, access)) forbidden()
  return admin
}

/** Only same-site admin paths are allowed as a post-login destination. */
export function safeAdminPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value
  return path && /^\/admin(\/|\?|$)/.test(path) && !path.startsWith("//") ? path : "/admin"
}
