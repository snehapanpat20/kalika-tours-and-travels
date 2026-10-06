import { parseInput } from "@/lib/validation/parse"
import { reviewListSchema } from "@/server/admin/content-schemas"
import { searchParamsToObject } from "@/server/admin/schemas"
import { apiRoute, ok, preflight } from "@/server/api/http"
import { requireAdmin } from "@/server/auth/admin-session"
import { adminListReviews } from "@/server/content/reviews"

/** GET /api/admin/reviews?status=PENDING|APPROVED|REJECTED&search=&page= */
export const GET = apiRoute(
  async (request) => {
    await requireAdmin(request, "reviews.read")
    const query = parseInput(reviewListSchema, searchParamsToObject(request.url), "Some filters are not valid.")
    return ok(await adminListReviews(query))
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET"])
