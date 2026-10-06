import { offerRoutes } from "@/server/cms/route-config"

/** GET, PATCH (save) and DELETE one item. Handlers: server/cms/route-config.ts */
export const GET = offerRoutes.single.GET
export const PATCH = offerRoutes.single.PATCH
export const DELETE = offerRoutes.single.DELETE
export const OPTIONS = offerRoutes.single.OPTIONS
