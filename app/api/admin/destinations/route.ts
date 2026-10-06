import { destinationRoutes } from "@/server/cms/route-config"

/** GET (list, filter, paginate) and POST (create). Handlers: server/cms/route-config.ts */
export const GET = destinationRoutes.collection.GET
export const POST = destinationRoutes.collection.POST
export const OPTIONS = destinationRoutes.collection.OPTIONS
