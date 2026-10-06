import "server-only"
import { cache } from "react"
import { draftMode } from "next/headers"
import { can } from "@/lib/auth/permissions"
import { getSignedInAdmin } from "@/server/auth/admin-session"

/**
 * True when a signed-in admin is previewing unpublished content. Draft Mode
 * alone is not enough: the session is checked too, so a leftover preview
 * cookie shows nothing unpublished once the admin has signed out.
 */
export const isPreviewing = cache(async (): Promise<boolean> => {
  if (!(await draftMode()).isEnabled) return false
  const admin = await getSignedInAdmin()
  return Boolean(admin && !admin.mustChangePassword && can(admin.role, "content.read"))
})
