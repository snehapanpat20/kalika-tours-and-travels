import { AppError } from "@/lib/errors/app-error"
import { apiRoute, ok, preflight, readFormData } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { sectionFor } from "@/server/cms/content-routes"
import { CONTENT_REQUEST_MAX_BYTES, adminGetSection, parseDraftInput, saveSectionDraft, sectionDefaults } from "@/server/cms/site-content"

type Context = { params: Promise<{ key: string }> }

/** GET /api/admin/content/:key */
export const GET = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "self")
    const section = await sectionFor(admin, context, "read")
    return ok({ section: { ...(await adminGetSection(section.key)), defaults: sectionDefaults(section) } })
  },
  { cors: true },
)

/**
 * PUT /api/admin/content/:key (multipart): save a draft. The website does not change until it is published.
 * Fields: `data` (JSON, see SectionDraftInput) plus any image files it refers to.
 */
export const PUT = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "self")
    const section = await sectionFor(admin, context, "write")
    const form = await readFormData(request, CONTENT_REQUEST_MAX_BYTES)
    const raw = form.get("data")
    if (typeof raw !== "string" || raw.length > 200_000) throw new AppError("BAD_REQUEST", "The content could not be read.", 400)
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      throw new AppError("BAD_REQUEST", "The content could not be read.", 400)
    }
    const input = parseDraftInput(section, json)
    const files = new Map<string, File>()
    for (const [name, value] of form.entries()) {
      if (value instanceof File && value.size > 0 && /^[a-z0-9_]{1,20}$/.test(name)) files.set(name, value)
    }

    const state = await saveSectionDraft(section, input, files)
    await recordAudit(admin, { action: "update", entityType: "SiteContent", entityId: section.key, summary: `${section.title} (draft saved)` })
    return ok({ section: { ...state, defaults: sectionDefaults(section) } }, { message: "Draft saved." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET", "PUT"])
