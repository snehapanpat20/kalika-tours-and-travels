import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/config/site"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/locales"
import { destinationPath, pagePath, pageSlugs, type PageKey } from "@/lib/routes"
import { listDestinationPages } from "@/server/cms/destinations"

// Rebuilt at most hourly, so newly published destination pages are listed without a deploy
export const revalidate = 3600

const hreflang: Record<Locale, string> = { en: "en-IN", mr: "mr-IN" }

/**
 * Public, indexable pages only, in both languages: the fixed pages plus each
 * published destination that has its own page. Admin, API, account, design-system
 * and preview addresses are never listed; drafts are excluded by the query.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const entry = (paths: Record<Locale, string>, extra: Partial<MetadataRoute.Sitemap[number]>) =>
    locales.map((locale) => ({
      url: `${siteUrl}${paths[locale]}`,
      alternates: {
        languages: {
          ...Object.fromEntries(locales.map((other) => [hreflang[other], `${siteUrl}${paths[other]}`])),
          "x-default": `${siteUrl}${paths[defaultLocale]}`,
        },
      },
      ...extra,
    }))

  const pages = (Object.keys(pageSlugs) as PageKey[]).flatMap((page) =>
    entry(
      { en: pagePath("en", page), mr: pagePath("mr", page) },
      {
        changeFrequency: page === "gallery" || page === "reviews" ? "weekly" : "monthly",
        priority: page === "home" ? 1 : page === "plan" || page === "services" || page === "traveller" ? 0.8 : 0.7,
      },
    ),
  )

  const destinations = (await listDestinationPages()).flatMap(({ slug, updatedAt }) =>
    entry({ en: destinationPath("en", slug), mr: destinationPath("mr", slug) }, { lastModified: updatedAt, changeFrequency: "monthly", priority: 0.6 }),
  )

  return [...pages, ...destinations]
}
