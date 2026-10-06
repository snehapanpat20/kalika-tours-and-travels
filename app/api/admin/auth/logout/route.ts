import { apiRoute, ok, preflight } from "@/server/api/http"
import { signOutAdmin } from "@/server/auth/admin-session"

/** POST /api/admin/auth/logout: clears the session cookie. */
export const POST = apiRoute(
  async (request) => {
    await signOutAdmin(request)
    return ok({}, { message: "Signed out." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
