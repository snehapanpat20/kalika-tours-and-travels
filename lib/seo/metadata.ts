import type { Metadata } from "next"
import { business } from "@/data/business"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, type Locale } from "@/lib/i18n/locales"
import { swapLocale } from "@/lib/i18n/locale-path"
import { getSiteUrl } from "@/lib/config/site"
import { pagePath, type PageKey } from "@/lib/routes"

export function createLocaleMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale)
  const path = `/${locale}`

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: business.name,
    authors: [{ name: business.owner }],
    title: {
      default: dictionary.meta.siteName,
      template: `%s · ${business.name}`,
    },
    description: dictionary.meta.description,
    alternates: {
      canonical: path,
      languages: {
        en: swapLocale(path, "en"),
        mr: swapLocale(path, "mr"),
        "x-default": swapLocale(path, defaultLocale),
      },
    },
    openGraph: {
      title: dictionary.meta.siteName,
      description: dictionary.meta.description,
      locale: locale === "mr" ? "mr_IN" : "en_IN",
      siteName: business.name,
      type: "website",
      url: path,
    },
  }
}

/** Metadata for one public page: exact title, description, canonical URL and language alternates. */
export function createPageMetadata(locale: Locale, page: PageKey): Metadata {
  const meta = getDictionary(locale).pages.meta[page]
  const path = pagePath(locale, page)
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: {
      canonical: path,
      languages: {
        en: pagePath("en", page),
        mr: pagePath("mr", page),
        "x-default": pagePath(defaultLocale, page),
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      locale: locale === "mr" ? "mr_IN" : "en_IN",
      siteName: business.name,
      type: "website",
      url: path,
    },
  }
}
