import { vehicleRoutes } from "@/server/cms/route-config"

/** GET (list, filter) and POST (create). Handlers: server/cms/route-config.ts */
export const GET = vehicleRoutes.collection.GET
export const POST = vehicleRoutes.collection.POST
export const OPTIONS = vehicleRoutes.collection.OPTIONS
