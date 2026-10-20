import { apiRoute, ok, preflight } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { importBuiltInVehicles } from "@/server/cms/vehicles"

/** POST /api/admin/vehicles/import: copy the website's vehicles into Admin › Fleet (only those not imported yet). */
export const POST = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "fleet.write")
    const count = await importBuiltInVehicles()
    if (count) await recordAudit(admin, { action: "import", entityType: "Vehicle", summary: `Imported ${count} vehicles from the website`, metadata: { count } })
    return ok({ count }, { status: count ? 201 : 200, message: count ? `${count} vehicles imported.` : "Every vehicle is already here." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
