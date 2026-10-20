import { vehicleRoutes } from "@/server/cms/route-config"

/** GET, PATCH (save, publish/unpublish) and DELETE one vehicle. Handlers: server/cms/route-config.ts */
export const GET = vehicleRoutes.single.GET
export const PATCH = vehicleRoutes.single.PATCH
export const DELETE = vehicleRoutes.single.DELETE
export const OPTIONS = vehicleRoutes.single.OPTIONS
