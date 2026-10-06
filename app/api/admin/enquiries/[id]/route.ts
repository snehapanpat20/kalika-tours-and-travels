import { readEnquiryId, type EnquiryRouteContext as Context } from "@/server/admin/params"
import { apiRoute, ok, preflight } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { getEnquiry, softDeleteEnquiry } from "@/server/enquiries/service"

/** GET /api/admin/enquiries/:id */
export const GET = apiRoute<Context>(
  async (request, context) => {
    await requireAdmin(request, "enquiries.read")
    return ok({ enquiry: await getEnquiry(await readEnquiryId(context)) })
  },
  { cors: true },
)

/** DELETE /api/admin/enquiries/:id: soft delete (kept in the database, hidden from the API). */
export const DELETE = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "enquiries.delete")
    const id = await readEnquiryId(context)
    const deleted = await softDeleteEnquiry(id)
    await recordAudit(admin, { action: "delete", entityType: "Enquiry", entityId: id, summary: `${deleted.fullName} (${deleted.destination})` })
    return ok({}, { message: "Enquiry deleted." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET", "DELETE"])
