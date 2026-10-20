import { parseInput } from "@/lib/validation/parse"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { reorderVehicles, vehicleOrderSchema } from "@/server/cms/vehicles"

/** PUT /api/admin/vehicles/order: the new order of every vehicle, first to last. */
export const PUT = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "fleet.write")
    const { ids } = parseInput(vehicleOrderSchema, await readJsonBody(request, 16 * 1024))
    const count = await reorderVehicles(ids)
    await recordAudit(admin, { action: "reorder", entityType: "Vehicle", summary: "Changed the order of the fleet", metadata: { count } })
    return ok({ count }, { message: "Order saved." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["PUT"])
