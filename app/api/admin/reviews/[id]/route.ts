import { parseInput } from "@/lib/validation/parse"
import { reviewUpdateSchema } from "@/server/admin/content-schemas"
import { readContentId, type IdRouteContext as Context } from "@/server/admin/params"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { deleteReview, updateReview } from "@/server/content/reviews"

const statusActions = { APPROVED: "approve", REJECTED: "reject", PENDING: "status_change" } as const

/**
 * PATCH /api/admin/reviews/:id
 * { "status": "APPROVED" }  or corrections: { "customerName", "destination", "tripType", "removePhoto": true }
 * The customer's review text itself cannot be edited.
 */
export const PATCH = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "reviews.moderate")
    const id = await readContentId(context, "Review")
    const update = parseInput(reviewUpdateSchema, await readJsonBody(request, 2 * 1024), "The review update is not valid.")
    const review = await updateReview(id, update)
    await recordAudit(admin, {
      action: update.status ? statusActions[update.status] : "update",
      entityType: "Review",
      entityId: id,
      summary: `${review.customerName} (${review.destination})`,
      metadata: update.status ? { to: update.status } : { removedPhoto: Boolean(update.removePhoto) },
    })
    return ok({ review }, { message: "Review updated." })
  },
  { cors: true },
)

/** DELETE /api/admin/reviews/:id: removes the review and its photo permanently. */
export const DELETE = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "reviews.delete")
    const id = await readContentId(context, "Review")
    const deleted = await deleteReview(id)
    await recordAudit(admin, { action: "delete", entityType: "Review", entityId: id, summary: `${deleted.customerName} (${deleted.destination})` })
    return ok({}, { message: "Review deleted." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["PATCH", "DELETE"])
