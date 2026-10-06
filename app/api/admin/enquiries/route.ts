import { parseInput } from "@/lib/validation/parse"
import { listQuerySchema, searchParamsToObject } from "@/server/admin/schemas"
import { apiRoute, ok, preflight } from "@/server/api/http"
import { requireAdmin } from "@/server/auth/admin-session"
import { listEnquiries } from "@/server/enquiries/service"

/**
 * GET /api/admin/enquiries
 * ?page=1&pageSize=20&status=NEW&from=2026-10-01&to=2026-10-31&search=goa&sort=newest
 */
export const GET = apiRoute(
  async (request) => {
    await requireAdmin(request, "enquiries.read")
    const query = parseInput(listQuerySchema, searchParamsToObject(request.url), "Some filters are not valid.")
    return ok(await listEnquiries(query))
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET"])
