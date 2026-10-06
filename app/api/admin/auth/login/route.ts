import { parseInput } from "@/lib/validation/parse"
import { loginSchema } from "@/server/admin/schemas"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { signInAdmin } from "@/server/auth/admin-session"

/** POST /api/admin/auth/login: sets an HttpOnly session cookie. The token is never returned in the body. */
export const POST = apiRoute(
  async (request) => {
    const { email, password } = parseInput(loginSchema, await readJsonBody(request, 2 * 1024), "Enter your email and password.")
    const { admin, expiresAt } = await signInAdmin(request, email, password)
    return ok({ admin, expiresAt: expiresAt.toISOString() }, { message: "Signed in." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
