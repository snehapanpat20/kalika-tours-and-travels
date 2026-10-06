import { apiRoute, ok, preflight } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { importBuiltInDestinations } from "@/server/cms/destinations"

/** POST /api/admin/destinations/import: copy the destinations the website shows today into the admin panel (only when there are none). */
export const POST = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "destinations.write")
    const count = await importBuiltInDestinations()
    await recordAudit(admin, { action: "import", entityType: "Destination", summary: `Imported ${count} destinations from the website`, metadata: { count } })
    return ok({ count }, { status: 201, message: `${count} destinations imported.` })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
