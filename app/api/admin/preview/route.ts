import { draftMode } from "next/headers"
import { apiRoute } from "@/server/api/http"
import { requireAdmin } from "@/server/auth/admin-session"

/** Only this website's own pages: /en, /mr/gallery, /en#journeys … never another site. */
const sitePath = /^\/(en|mr)(\/[a-z-]{1,40})?\/?(#[a-z-]{1,40})?$/

/**
 * GET /api/admin/preview?path=/en/gallery
 * Shows the website with unpublished drafts, for the signed-in admin only.
 * Turns on Next.js Draft Mode (a signed, HttpOnly cookie) and opens the page.
 */
export const GET = apiRoute(async (request) => {
  await requireAdmin(request, "content.read")
  const requested = new URL(request.url).searchParams.get("path") ?? "/en"
  const path = sitePath.test(requested) ? requested : "/en"
  ;(await draftMode()).enable()
  return new Response(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } })
})
