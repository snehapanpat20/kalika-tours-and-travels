import "server-only"
import { JsonLd } from "@/components/seo/json-ld"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath, type PageKey } from "@/lib/routes"
import { graph, webPageSchema, type Crumb } from "@/lib/seo/structured-data"
import { getSiteDictionary } from "@/server/cms/site-content"

type InnerPage = Exclude<PageKey, "home">

/** Home › This page, with the page names used in the main navigation. */
export function pageCrumbs(locale: Locale, dictionary: Dictionary, page: InnerPage, extra: Crumb[] = []): Crumb[] {
  return [
    { name: dictionary.nav.home, path: pagePath(locale, "home") },
    { name: dictionary.nav[page], path: pagePath(locale, page) },
    ...extra,
  ]
}

const pageTypes: Partial<Record<PageKey, "AboutPage" | "ContactPage" | "CollectionPage">> = {
  about: "AboutPage",
  contact: "ContactPage",
  destinations: "CollectionPage",
  gallery: "CollectionPage",
}

/**
 * WebPage + BreadcrumbList JSON-LD for one of the fixed pages, using the same
 * (published) title and description as its meta tags. `extra` adds nodes such
 * as a Service.
 */
export async function PageStructuredData({
  locale,
  page,
  crumbs,
  extra = [],
}: {
  locale: Locale
  page: PageKey
  crumbs?: Crumb[]
  extra?: Record<string, unknown>[]
}) {
  const meta = (await getSiteDictionary(locale, false)).pages.meta[page]
  const nodes = webPageSchema({
    locale,
    path: pagePath(locale, page),
    title: meta.title,
    description: meta.description,
    crumbs,
    type: pageTypes[page] ?? "WebPage",
  })
  return <JsonLd data={graph([...nodes, ...extra])} />
}
