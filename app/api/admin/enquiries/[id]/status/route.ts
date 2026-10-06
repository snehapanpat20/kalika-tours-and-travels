import { parseInput } from "@/lib/validation/parse"
import { readEnquiryId, type EnquiryRouteContext as Context } from "@/server/admin/params"
import { statusUpdateSchema } from "@/server/admin/schemas"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { updateEnquiryStatus } from "@/server/enquiries/service"

/** PATCH /api/admin/enquiries/:id/status  { "status": "CONTACTED" } */
export const PATCH = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "enquiries.write")
    const id = await readEnquiryId(context)
    const { status } = parseInput(statusUpdateSchema, await readJsonBody(request, 1024), "Status is not valid.")
    const { enquiry, previousStatus } = await updateEnquiryStatus(id, status)
    if (previousStatus !== status) {
      await recordAudit(admin, {
        action: "status_change",
        entityType: "Enquiry",
        entityId: id,
        summary: `${enquiry.fullName} (${enquiry.destination})`,
        metadata: { from: previousStatus, to: status },
      })
    }
    return ok({ enquiry }, { message: "Status updated." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["PATCH"])
