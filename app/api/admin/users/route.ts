import { parseInput } from "@/lib/validation/parse"
import { searchParamsToObject } from "@/server/admin/schemas"
import { createAdmin, listAdmins, userCreateSchema, userListSchema } from "@/server/admin/users"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"

/** GET /api/admin/users?search=&role=&status=active|disabled&page= (Super Admin only) */
export const GET = apiRoute(
  async (request) => {
    await requireAdmin(request, "users.read")
    const query = parseInput(userListSchema, searchParamsToObject(request.url), "Some filters are not valid.")
    return ok(await listAdmins(query))
  },
  { cors: true },
)

/**
 * POST /api/admin/users  { name, email, role, password } (Super Admin only)
 * The password is temporary: the new admin must choose their own at first sign-in.
 */
export const POST = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "users.write")
    const input = parseInput(userCreateSchema, await readJsonBody(request, 4 * 1024))
    const created = await createAdmin(input)
    await recordAudit(admin, { action: "create", entityType: "Admin", entityId: created.id, summary: `${created.name} <${created.email}>`, metadata: { role: created.role } })
    return ok({ user: created }, { status: 201, message: "Admin created." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET", "POST"])
