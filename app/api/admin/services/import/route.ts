import { apiRoute, ok, preflight } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { importBuiltInServices } from "@/server/cms/services"

/** POST /api/admin/services/import: copy the website's five services into the admin panel (only when there are none). */
export const POST = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "services.write")
    const count = await importBuiltInServices()
    await recordAudit(admin, { action: "import", entityType: "Service", summary: `Imported ${count} services from the website`, metadata: { count } })
    return ok({ count }, { status: 201, message: `${count} services imported.` })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
