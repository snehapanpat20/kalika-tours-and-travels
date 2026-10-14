import type { Locale } from "@/lib/i18n/locales"

/** Public pages and their URL slugs. Every link to a page is built from here. */
export const pageSlugs = {
  home: "",
  about: "about",
  services: "services",
  destinations: "destinations",
  traveller: "traveller",
  gallery: "gallery",
  reviews: "reviews",
  contact: "contact",
  plan: "plan-your-trip",
} as const

export type PageKey = keyof typeof pageSlugs

export function pagePath(locale: Locale, page: PageKey, hash?: string): string {
  const slug = pageSlugs[page]
  return `/${locale}${slug ? `/${slug}` : ""}${hash ? `#${hash}` : ""}`
}

/** The trip planner, optionally pre-filled with a service, destination, number of people and travel date (YYYY-MM-DD). */
export function planPath(locale: Locale, prefill: { service?: string; destination?: string; people?: string; date?: string } = {}): string {
  const query = new URLSearchParams()
  if (prefill.service) query.set("service", prefill.service)
  if (prefill.destination) query.set("destination", prefill.destination)
  if (prefill.people) query.set("people", prefill.people)
  if (prefill.date) query.set("date", prefill.date)
  const text = query.toString()
  return `${pagePath(locale, "plan")}${text ? `?${text}` : ""}`
}

/** A destination's own page (only destinations with a full write-up have one). */
export function destinationPath(locale: Locale, slug: string): string {
  return `${pagePath(locale, "destinations")}/${slug}`
}

/**
 * Pages that open with a dark photograph behind the header, which stays
 * transparent with light text until the page scrolls: the homepage only.
 */
const darkHeroPaths: string[] = ["/en", "/mr"]

/** True when `pathname` opens with a dark photograph, so the header shows light text over it. */
export function hasDarkHero(pathname: string): boolean {
  return darkHeroPaths.includes(pathname.replace(/\/$/, ""))
}
