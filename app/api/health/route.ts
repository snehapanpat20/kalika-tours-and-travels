import { apiRoute, ok } from "@/server/api/http"
import { describeError, logger } from "@/server/api/logger"
import { getPrisma } from "@/server/db/prisma"

/** GET /api/health: for uptime monitors. Reports whether the database answers. */
export const GET = apiRoute(async () => {
  try {
    await getPrisma().$queryRaw`SELECT 1`
    return ok({ status: "ok", database: "up" })
  } catch (error) {
    logger.error("health_database_down", describeError(error))
    return Response.json({ success: false, code: "SERVICE_UNAVAILABLE", message: "Database unavailable.", errors: [], status: "degraded", database: "down" }, { status: 503 })
  }
})
