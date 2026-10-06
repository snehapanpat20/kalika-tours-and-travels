import { destinationRoutes } from "@/server/cms/route-config"

/** GET, PATCH (save) and DELETE one item. Handlers: server/cms/route-config.ts */
export const GET = destinationRoutes.single.GET
export const PATCH = destinationRoutes.single.PATCH
export const DELETE = destinationRoutes.single.DELETE
export const OPTIONS = destinationRoutes.single.OPTIONS
