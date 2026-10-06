import { draftMode } from "next/headers"
import { apiRoute } from "@/server/api/http"

const sitePath = /^\/(en|mr)(\/[a-z-]{1,40})?\/?$/

/** GET /api/admin/preview/exit?path=/en: back to the live website. Anyone may leave preview. */
export const GET = apiRoute(async (request) => {
  const requested = new URL(request.url).searchParams.get("path") ?? "/en"
  ;(await draftMode()).disable()
  return new Response(null, { status: 307, headers: { Location: sitePath.test(requested) ? requested : "/en", "Cache-Control": "no-store" } })
})
