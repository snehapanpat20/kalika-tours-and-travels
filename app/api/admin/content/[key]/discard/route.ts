import { apiRoute, ok, preflight } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { sectionFor } from "@/server/cms/content-routes"
import { discardSectionDraft, sectionDefaults } from "@/server/cms/site-content"

type Context = { params: Promise<{ key: string }> }

/** POST /api/admin/content/:key/discard: throw away unpublished changes. */
export const POST = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "self")
    const section = await sectionFor(admin, context, "write")
    const state = await discardSectionDraft(section)
    await recordAudit(admin, { action: "discard_draft", entityType: "SiteContent", entityId: section.key, summary: section.title })
    return ok({ section: { ...state, defaults: sectionDefaults(section) } }, { message: "Unpublished changes discarded." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
