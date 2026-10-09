import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/config/site"

/**
 * Public pages are open to crawlers. Private areas are not: the admin panel,
 * the API, preview/draft routes and the customer account placeholder.
 * (Pages that must not appear in results also carry a noindex tag.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/en/account", "/mr/account", "/en/design-system", "/mr/design-system"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl(),
  }
}
