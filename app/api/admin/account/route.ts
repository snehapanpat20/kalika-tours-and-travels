import { parseInput } from "@/lib/validation/parse"
import { profileUpdateSchema, updateOwnProfile } from "@/server/admin/users"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"

/** GET /api/admin/account: the signed-in admin's own details. */
export const GET = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "self")
    return ok({ account: admin })
  },
  { cors: true },
)

/** PATCH /api/admin/account  { name }: change your own display name. */
export const PATCH = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "self")
    const input = parseInput(profileUpdateSchema, await readJsonBody(request, 1024))
    const account = await updateOwnProfile(admin, input)
    await recordAudit({ ...admin, name: account.name }, { action: "update", entityType: "Admin", entityId: admin.id, summary: "Updated own profile" })
    return ok({ account }, { message: "Profile updated." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET", "PATCH"])
