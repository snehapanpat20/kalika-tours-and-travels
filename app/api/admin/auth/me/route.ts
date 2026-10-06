import { apiRoute, ok, preflight } from "@/server/api/http"
import { requireAdmin } from "@/server/auth/admin-session"

/** GET /api/admin/auth/me: the signed-in admin, or 401. */
export const GET = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "self")
    return ok({ admin })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET"])
