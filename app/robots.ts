import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/config/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/en/account", "/mr/account"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
