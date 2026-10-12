import { business } from "@/data/business"
import { getSiteUrl } from "@/lib/config/site"
import type { Locale } from "@/lib/i18n/locales"

/**
 * schema.org structured data (JSON-LD). Only verified business facts are used:
 * no ratings, review counts, prices, opening hours or coordinates, because the
 * business has not provided them. Review markup is deliberately not used: Google
 * does not show review stars for a business's own reviews of itself.
 */

type Json = Record<string, unknown>

export const DEFAULT_SHARE_IMAGE = "/og/kalika-yatra.jpg"
const BRAND_LOGO = "/images/brand/kalika-yatra-logo.png"

const absolute = (path: string) => (path.startsWith("http") ? path : `${getSiteUrl()}${path}`)

export const businessId = () => `${getSiteUrl()}/#business`
export const websiteId = () => `${getSiteUrl()}/#website`

const serviceNames = {
  en: ["Outstation trips", "Family tours", "Group tours", "Pilgrimage tours", "Corporate trips"],
  mr: ["आउटस्टेशन ट्रिप्स", "कौटुंबिक सहली", "ग्रुप टूर्स", "तीर्थयात्रा", "कॉर्पोरेट ट्रिप्स"],
} satisfies Record<Locale, string[]>

/** The business: a travel agency (a kind of LocalBusiness) in Hadapsar, Pune. */
export function businessSchema(locale: Locale): Json {
  return {
    "@type": "TravelAgency",
    "@id": businessId(),
    name: business.name,
    alternateName: business.localName.mr,
    url: absolute(`/${locale}`),
    logo: absolute(BRAND_LOGO),
    image: absolute(DEFAULT_SHARE_IMAGE),
    description:
      "Tours and travels from Hadapsar, Pune, with a 20+1 seater Traveller for family, group, pilgrimage, corporate and outstation trips.",
    email: business.email,
    telephone: [business.phoneE164, business.callOnlyPhoneE164],
    address: {
      "@type": "PostalAddress",
      addressLocality: `${business.location.area.en}, ${business.location.city.en}`,
      addressRegion: business.location.state.en,
      addressCountry: "IN",
    },
    areaServed: [
      { "@type": "City", name: "Pune" },
      { "@type": "State", name: "Maharashtra" },
    ],
    sameAs: [business.instagramUrl],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: locale === "mr" ? "प्रवास सेवा" : "Travel services",
      itemListElement: serviceNames[locale].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
    },
  }
}

export function websiteSchema(locale: Locale): Json {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    url: absolute("/"),
    name: business.name,
    inLanguage: ["en-IN", "mr-IN"],
    publisher: { "@id": businessId() },
    ...(locale === "mr" ? { alternateName: business.localName.mr } : {}),
  }
}

export type Crumb = { name: string; path: string }

export function breadcrumbSchema(crumbs: Crumb[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absolute(crumb.path) })),
  }
}

/** One page: what it is, which site it belongs to and, for inner pages, its breadcrumb trail. */
export function webPageSchema({
  locale,
  path,
  title,
  description,
  image,
  crumbs,
  type = "WebPage",
}: {
  locale: Locale
  path: string
  title: string
  description: string
  image?: string
  crumbs?: Crumb[]
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage"
}): Json[] {
  const url = absolute(path)
  const page: Json = {
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: locale === "mr" ? "mr-IN" : "en-IN",
    isPartOf: { "@id": websiteId() },
    about: { "@id": businessId() },
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: absolute(image) } } : {}),
  }
  if (!crumbs?.length) return [page]
  const trail = { ...breadcrumbSchema(crumbs), "@id": `${url}#breadcrumb` }
  page.breadcrumb = { "@id": `${url}#breadcrumb` }
  return [page, trail]
}

/** A service the business provides, e.g. renting out the Traveller with a driver. */
export function serviceSchema({ name, description, serviceType, url }: { name: string; description: string; serviceType: string; url: string }): Json {
  return {
    "@type": "Service",
    name,
    description,
    serviceType,
    url: absolute(url),
    provider: { "@id": businessId() },
    areaServed: [
      { "@type": "City", name: "Pune" },
      { "@type": "State", name: "Maharashtra" },
    ],
  }
}

/** Wraps nodes in one @graph document. */
export function graph(nodes: Json[]): Json {
  return { "@context": "https://schema.org", "@graph": nodes }
}

/** The Traveller page's service: renting the 20+1 seater Traveller with a driver. */
export function travellerServiceSchema(locale: Locale): Json {
  return serviceSchema({
    name: locale === "mr" ? "चालकासह 20+1 आसनी ट्रॅव्हलर भाड्याने" : "20+1 seater Traveller rental with driver",
    description:
      locale === "mr"
        ? "पुण्याहून कौटुंबिक, ग्रुप, तीर्थयात्रा, कॉर्पोरेट आणि आउटस्टेशन सहलींसाठी वातानुकूलित 20+1 आसनी फोर्स ट्रॅव्हलर, अनुभवी चालकासह."
        : "An air-conditioned 20+1 seater Force Traveller with an experienced driver, for family, group, pilgrimage, corporate and outstation trips from Pune.",
    serviceType: "Tempo Traveller rental",
    url: `/${locale}/traveller`,
  })
}
