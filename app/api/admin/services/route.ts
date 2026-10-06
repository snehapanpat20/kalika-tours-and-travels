import { serviceRoutes } from "@/server/cms/route-config"

/** GET (list, filter, paginate) and POST (create). Handlers: server/cms/route-config.ts */
export const GET = serviceRoutes.collection.GET
export const POST = serviceRoutes.collection.POST
export const OPTIONS = serviceRoutes.collection.OPTIONS
