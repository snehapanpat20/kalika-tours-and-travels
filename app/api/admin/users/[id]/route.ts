import { parseInput } from "@/lib/validation/parse"
import { readContentId, type IdRouteContext as Context } from "@/server/admin/params"
import { updateAdmin, userUpdateSchema } from "@/server/admin/users"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"

/**
 * PATCH /api/admin/users/:id  { name?, email?, role?, isActive? } (Super Admin only)
 * Admins can't change their own role or disable themselves, and the last
 * active Super Admin can't be demoted or disabled.
 */
export const PATCH = apiRoute<Context>(
  async (request, context) => {
    const actor = await requireAdmin(request, "users.write")
    const id = await readContentId(context, "Admin")
    const input = parseInput(userUpdateSchema, await readJsonBody(request, 2 * 1024))
    const { before, admin } = await updateAdmin(actor, id, input)
    const summary = `${admin.name} <${admin.email}>`
    if (before.role !== admin.role) {
      await recordAudit(actor, { action: "role_change", entityType: "Admin", entityId: id, summary, metadata: { from: before.role, to: admin.role } })
    }
    if (before.isActive !== admin.isActive) {
      await recordAudit(actor, { action: admin.isActive ? "enable" : "disable", entityType: "Admin", entityId: id, summary })
    }
    if (before.name !== admin.name || before.email !== admin.email) {
      await recordAudit(actor, { action: "update", entityType: "Admin", entityId: id, summary, metadata: { emailChanged: before.email !== admin.email } })
    }
    return ok({ user: admin }, { message: "Admin updated." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["PATCH"])
