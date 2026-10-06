import { announcementRoutes } from "@/server/cms/route-config"

/** GET (list, filter, paginate) and POST (create). Handlers: server/cms/route-config.ts */
export const GET = announcementRoutes.collection.GET
export const POST = announcementRoutes.collection.POST
export const OPTIONS = announcementRoutes.collection.OPTIONS
