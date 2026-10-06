import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/config/site"
import { locales } from "@/lib/i18n/locales"
import { pageSlugs } from "@/lib/routes"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const url = (locale: string, slug: string) => `${siteUrl}/${locale}${slug ? `/${slug}` : ""}`

  return Object.values(pageSlugs).flatMap((slug) =>
    locales.map((locale) => ({
      url: url(locale, slug),
      changeFrequency: slug === "gallery" || slug === "reviews" ? ("weekly" as const) : ("monthly" as const),
      priority: slug === "" ? 1 : 0.7,
      alternates: { languages: Object.fromEntries(locales.map((other) => [other, url(other, slug)])) },
    })),
  )
}
