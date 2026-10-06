import { parseInput } from "@/lib/validation/parse"
import { readContentId, type IdRouteContext as Context } from "@/server/admin/params"
import { passwordResetSchema, resetAdminPassword } from "@/server/admin/users"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"

/**
 * POST /api/admin/users/:id/password  { password } (Super Admin only)
 * Sets a temporary password, signs that admin out everywhere, and makes them
 * choose a new password at their next sign-in. The password is never logged.
 */
export const POST = apiRoute<Context>(
  async (request, context) => {
    const actor = await requireAdmin(request, "users.write")
    const id = await readContentId(context, "Admin")
    const { password } = parseInput(passwordResetSchema, await readJsonBody(request, 1024))
    const { admin } = await resetAdminPassword(actor, id, password)
    await recordAudit(actor, { action: "password_reset", entityType: "Admin", entityId: id, summary: `${admin.name} <${admin.email}>` })
    return ok({ user: admin }, { message: "Temporary password set. They'll choose a new one when they sign in." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
