import { offerRoutes } from "@/server/cms/route-config"

/** GET (list, filter, paginate) and POST (create). Handlers: server/cms/route-config.ts */
export const GET = offerRoutes.collection.GET
export const POST = offerRoutes.collection.POST
export const OPTIONS = offerRoutes.collection.OPTIONS
