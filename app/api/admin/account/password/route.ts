import { parseInput } from "@/lib/validation/parse"
import { changeOwnPassword, passwordChangeSchema } from "@/server/admin/users"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"

/**
 * POST /api/admin/account/password  { currentPassword, newPassword }
 * Needs the current password. Other sessions are signed out; this one continues.
 */
export const POST = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "self")
    const input = parseInput(passwordChangeSchema, await readJsonBody(request, 1024))
    const account = await changeOwnPassword(admin, input)
    await recordAudit(admin, { action: "password_change", entityType: "Admin", entityId: admin.id, summary: "Changed own password" })
    return ok({ account }, { message: "Password changed." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
