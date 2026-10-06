import { announcementRoutes } from "@/server/cms/route-config"

/** GET, PATCH (save) and DELETE one item. Handlers: server/cms/route-config.ts */
export const GET = announcementRoutes.single.GET
export const PATCH = announcementRoutes.single.PATCH
export const DELETE = announcementRoutes.single.DELETE
export const OPTIONS = announcementRoutes.single.OPTIONS
