import { parseInput } from "@/lib/validation/parse"
import { auditListSchema, listAuditLogs } from "@/server/admin/audit"
import { searchParamsToObject } from "@/server/admin/schemas"
import { apiRoute, ok, preflight } from "@/server/api/http"
import { requireAdmin } from "@/server/auth/admin-session"

/** GET /api/admin/audit-logs?entityType=&action=&actorId=&from=&to=&search=&page= (Super Admin only) */
export const GET = apiRoute(
  async (request) => {
    await requireAdmin(request, "audit.read")
    const query = parseInput(auditListSchema, searchParamsToObject(request.url), "Some filters are not valid.")
    return ok(await listAuditLogs(query))
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET"])
