import "server-only"
import type { Metadata } from "next"
import { business } from "@/data/business"
import { getSiteUrl } from "@/lib/config/site"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, type Locale } from "@/lib/i18n/locales"
import { pagePath, type PageKey } from "@/lib/routes"
import { DEFAULT_SHARE_IMAGE } from "@/lib/seo/structured-data"
import { getSectionExtras, getSiteDictionary } from "@/server/cms/site-content"

/**
 * Search and sharing metadata. Every public page gets its own title,
 * description, canonical URL (on NEXT_PUBLIC_SITE_URL, never localhost in
 * production), English/Marathi alternates, Open Graph and X card.
 * Titles and descriptions can be edited in Admin → SEO; only published edits are used.
 */

const ogLocale = (locale: Locale) => (locale === "mr" ? "mr_IN" : "en_IN")

/** The sharing image: the one chosen in Admin → SEO, or the default branded image. */
async function shareImage(): Promise<{ url: string; width: number; height: number; alt: string }> {
  const seo = await getSectionExtras("seo", false)
  const image = seo?.image
  return image
    ? { url: image.url, width: image.width, height: image.height, alt: business.name }
    : { url: DEFAULT_SHARE_IMAGE, width: 1200, height: 630, alt: `${business.name}, Hadapsar, Pune` }
}

/** Defaults for every page under /[locale]; pages override what they know better. */
export async function createLocaleMetadata(locale: Locale): Promise<Metadata> {
  const dictionary = getDictionary(locale)
  const image = await shareImage()
  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: business.name,
    authors: [{ name: business.owner }],
    creator: business.name,
    publisher: business.name,
    title: {
      default: dictionary.meta.siteName,
      template: `%s | ${business.name}`,
    },
    description: dictionary.meta.description,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      siteName: business.name,
      locale: ogLocale(locale),
      type: "website",
      images: [image],
    },
    twitter: { card: "summary_large_image", images: [image.url] },
    formatDetection: { telephone: false, email: false, address: false },
  }
}

type PageMetaOptions = {
  /** For pages outside the fixed list (e.g. a destination): its own path, title and description. */
  path?: { en: string; mr: string }
  title?: string
  description?: string
  image?: { url: string; width?: number; height?: number; alt?: string }
}

/** Metadata for one public page: exact title, description, canonical URL, alternates and sharing card. */
export async function createPageMetadata(locale: Locale, page: PageKey | null, options: PageMetaOptions = {}): Promise<Metadata> {
  const meta = page ? (await getSiteDictionary(locale, false)).pages.meta[page] : null
  const title = options.title ?? meta?.title ?? business.name
  const description = options.description ?? meta?.description ?? getDictionary(locale).meta.description
  const paths = options.path ?? (page ? { en: pagePath("en", page), mr: pagePath("mr", page) } : { en: "/en", mr: "/mr" })
  const path = paths[locale]
  const image = options.image ?? (await shareImage())

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      languages: { "en-IN": paths.en, "mr-IN": paths.mr, "x-default": paths[defaultLocale] },
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: business.name,
      locale: ogLocale(locale),
      alternateLocale: [ogLocale(locale === "en" ? "mr" : "en")],
      type: "website",
      images: [{ ...image, alt: image.alt ?? title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  }
}
