import { ArrowUp, Mail, MapPin, Phone, UsersRound } from "lucide-react"
import { BrandLogo } from "@/components/ui/logo"
import { InstagramIcon } from "@/components/ui/icons"
import { focusRing, shell } from "@/components/ui/styles"
import { business, callNumbers, formatLocation } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

const linkClass = cn("inline-flex min-h-9 items-center text-[0.9375rem] text-white/70 transition-colors hover:text-teal-light", focusRing)
const headingClass = "text-xs font-bold tracking-[0.16em] text-teal-light uppercase"

export function SiteFooter({
  locale,
  dictionary,
  services,
}: {
  locale: Locale
  dictionary: Dictionary
  services: { anchor: string; name: string }[]
}) {
  const nav = dictionary.nav
  const copy = dictionary.home.footer
  const contact = dictionary.home.contact
  const home = `/${locale}`

  const explore = [
    { label: nav.home, href: home },
    { label: nav.about, href: pagePath(locale, "about") },
    { label: nav.services, href: pagePath(locale, "services") },
    { label: nav.destinations, href: pagePath(locale, "destinations") },
    { label: nav.traveller, href: pagePath(locale, "traveller") },
    { label: nav.gallery, href: pagePath(locale, "gallery") },
    { label: nav.reviews, href: pagePath(locale, "reviews") },
    { label: nav.contact, href: pagePath(locale, "contact") },
    { label: nav.plan, href: pagePath(locale, "plan") },
  ]

  return (
    <footer className="relative mt-auto overflow-hidden bg-forest-deep text-white">
      <div className={cn(shell, "grid gap-12 pt-16 pb-12 md:grid-cols-2 md:pt-20 lg:grid-cols-12 lg:gap-8")}>
        <div className="lg:col-span-4 lg:pr-8">
          <BrandLogo size="footer" plate alt={business.localName[locale]} />
          <p className="mt-6 max-w-xs text-[0.9375rem] leading-relaxed text-white/75">{copy.description}</p>
          <p className="mt-5 flex items-start gap-2.5 text-[0.9375rem] leading-6 text-white/65">
            <MapPin aria-hidden="true" strokeWidth={1.8} className="mt-0.5 size-[1.125rem] shrink-0 text-coral" />
            {formatLocation(locale)}
          </p>
        </div>

        <nav aria-label={copy.explore} className="lg:col-span-2">
          <h2 className={headingClass}>{copy.explore}</h2>
          <ul className="mt-5 grid gap-1">
            {explore.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={linkClass}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={copy.services} className="lg:col-span-2">
          <h2 className={headingClass}>{copy.services}</h2>
          <ul className="mt-5 grid gap-1">
            {services.map((service) => (
              <li key={service.anchor}>
                <a href={pagePath(locale, "services", service.anchor)} className={linkClass}>
                  {service.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-2 lg:col-span-4">
          <h2 className={headingClass}>{copy.contact}</h2>
          <ul className="mt-5 grid gap-1">
            {callNumbers.map((number) => (
              <li key={number.e164}>
                <a href={`tel:${number.e164}`} className={cn(linkClass, "gap-3")}>
                  <Phone aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem] text-white/45" />
                  <span className="sr-only">{contact.call}: </span>
                  {number.display}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${business.email}`} className={cn(linkClass, "gap-3 break-all")}>
                <Mail aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem] shrink-0 text-white/45" />
                <span className="sr-only">{contact.email}: </span>
                {business.email}
              </a>
            </li>
          </ul>

          <h2 className={cn(headingClass, "mt-9")}>{copy.follow}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            <li>
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex min-h-11 items-center gap-2.5 rounded-button px-4 text-sm font-medium text-white/85 ring-1 ring-white/25 transition hover:bg-white hover:text-forest",
                  focusRing,
                )}
              >
                <InstagramIcon className="size-[1.125rem]" />
                {contact.instagram}
              </a>
            </li>
            <li>
              <a
                href={business.whatsappCommunityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex min-h-11 items-center gap-2.5 rounded-button px-4 text-sm font-medium text-white/85 ring-1 ring-white/25 transition hover:bg-white hover:text-forest",
                  focusRing,
                )}
              >
                <UsersRound aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem]" />
                {contact.community}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className={cn(shell, "flex flex-col gap-3 py-6 text-[0.8125rem] text-white/55 sm:flex-row sm:items-center sm:justify-between")}>
          <p>
            © {new Date().getFullYear()} {business.localName[locale]}. {copy.rights}
          </p>
          <a href="#top" className={cn("inline-flex min-h-11 items-center gap-2 font-semibold text-white/70 hover:text-white sm:min-h-0", focusRing)}>
            {copy.backToTop}
            <ArrowUp aria-hidden="true" strokeWidth={2} className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  )
}
