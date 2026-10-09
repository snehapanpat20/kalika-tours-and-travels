import "server-only"
import { can } from "@/lib/auth/permissions"
import { contentSections, type ContentSection } from "@/lib/cms/sections"
import { AppError } from "@/lib/errors/app-error"
import { assertAccess, type AdminProfile } from "@/server/auth/admin-session"
import { requireSection } from "@/server/cms/site-content"

/** Reading a section needs content.read, or traveller.read for the Traveller. */
export const readPermission = (section: ContentSection) =>
  section.permission === "traveller.write" ? "traveller.read" : section.permission === "settings.write" ? "settings.read" : "content.read"

/** The section for a route key, after checking the admin may read (or edit) it. */
export async function sectionFor(admin: AdminProfile, context: { params: Promise<{ key: string }> }, mode: "read" | "write") {
  const key = (await context.params).key
  if (!/^[a-z]{1,40}$/.test(key)) throw new AppError("NOT_FOUND", "That website section does not exist.", 404)
  const section = requireSection(key)
  assertAccess(admin, mode === "write" ? section.permission : readPermission(section))
  return section
}

export function readableSections(admin: AdminProfile) {
  return contentSections.filter((section) => can(admin.role, readPermission(section)))
}
