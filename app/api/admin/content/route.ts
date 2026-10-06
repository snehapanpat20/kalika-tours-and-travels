import { apiRoute, ok, preflight } from "@/server/api/http"
import { assertAccess, requireAdmin } from "@/server/auth/admin-session"
import { readableSections } from "@/server/cms/content-routes"
import { adminListSections, sectionDefaults } from "@/server/cms/site-content"

/** GET /api/admin/content: every website section this admin may see, with its draft, live version and built-in text. */
export const GET = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "self")
    // Section access is checked per section below; this rejects admins who must change their password first
    assertAccess(admin, "dashboard.read")
    const allowed = readableSections(admin)
    if (!allowed.length) return ok({ sections: [] })
    const states = await adminListSections()
    const sections = allowed.map((section) => ({ ...states.find((state) => state.key === section.key)!, defaults: sectionDefaults(section) }))
    return ok({ sections })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET"])
