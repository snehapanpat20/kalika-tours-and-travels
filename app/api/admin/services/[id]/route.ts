import { serviceRoutes } from "@/server/cms/route-config"

/** GET, PATCH (save) and DELETE one item. Handlers: server/cms/route-config.ts */
export const GET = serviceRoutes.single.GET
export const PATCH = serviceRoutes.single.PATCH
export const DELETE = serviceRoutes.single.DELETE
export const OPTIONS = serviceRoutes.single.OPTIONS
