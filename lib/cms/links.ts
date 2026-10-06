import type { Locale } from "@/lib/i18n/locales"
import { pagePath, pageSlugs, type PageKey } from "@/lib/routes"

/**
 * Button links in admin-edited content. The owner either picks a page of this
 * website (stored as "page:plan", so it works in both languages) or types a
 * web address. Only https, tel: and mailto: addresses are allowed, so a link
 * can never run script (javascript:) or point at plain http.
 */
export type CmsLink = string

export const linkablePages: { key: PageKey; label: string }[] = [
  { key: "plan", label: "Plan Your Trip page" },
  { key: "home", label: "Home page" },
  { key: "services", label: "Services page" },
  { key: "destinations", label: "Destinations page" },
  { key: "traveller", label: "Our Traveller page" },
  { key: "gallery", label: "Gallery page" },
  { key: "reviews", label: "Reviews page" },
  { key: "about", label: "About page" },
  { key: "contact", label: "Contact page" },
]

const pageLink = /^page:([a-z]+)$/
const externalLink = /^(https:\/\/[^\s<>"']{3,490}|tel:\+?[0-9 ()-]{6,20}|mailto:[^\s@<>"']+@[^\s@<>"']+)$/

export const LINK_ERROR = "Choose a page, or enter a web address starting with https://"

export function isValidLink(value: string): boolean {
  const page = value.match(pageLink)?.[1]
  if (page) return page in pageSlugs
  return externalLink.test(value)
}

/** The href for a stored link, or null if it is empty or no longer valid. */
export function resolveLink(locale: Locale, value: string | null | undefined): { href: string; external: boolean } | null {
  if (!value) return null
  const page = value.match(pageLink)?.[1]
  if (page) return page in pageSlugs ? { href: pagePath(locale, page as PageKey), external: false } : null
  return externalLink.test(value) ? { href: value, external: value.startsWith("https://") } : null
}

export function describeLink(value: string | null | undefined): string {
  if (!value) return "No link"
  const page = value.match(pageLink)?.[1]
  return linkablePages.find((option) => option.key === page)?.label ?? value
}
