import { ArrowUp, Mail, MapPin, Phone, UsersRound } from "lucide-react"
import { BrandLogo } from "@/components/ui/logo"
import { InstagramIcon } from "@/components/ui/icons"
import { focusRing, shell } from "@/components/ui/styles"
import { business, callNumbers, formatLocation } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

const linkClass = cn("inline-flex min-h-10 items-center gap-2 text-[0.9375rem] text-white/80 transition-colors hover:text-highlight", focusRing)
const socialClass = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-white ring-1 ring-highlight/50 transition duration-300 hover:bg-highlight hover:text-forest motion-safe:hover:-translate-y-0.5",
  focusRing,
)

/**
 * The shared footer, kept short: the logo and tagline with the social links,
 * one row of services, one row of contact details, and a slim bottom strip.
 * The header already carries the full navigation, so it isn't repeated here;
 * only Contact and Plan a Trip sit in the bottom strip. The strip leaves room
 * on the right for the floating WhatsApp button.
 */
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

  return (
    <footer className="brand-palette relative isolate mt-auto overflow-hidden border-t-2 border-highlight/60 bg-forest-deep text-white">
      <div aria-hidden="true" className="landing-jali absolute inset-0 -z-10 opacity-[0.05]" />

      <div className={cn(shell, "grid gap-5 pt-8 pb-5")}>
        {/* Brand and social links */}
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <BrandLogo size="badge" plate alt={business.localName[locale]} />
            <p className="font-display text-xl leading-snug text-white/90 sm:text-[1.375rem]">{copy.description}</p>
          </div>
          <ul aria-label={copy.follow} className="flex gap-3">
            <li>
              <a href={business.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={contact.instagram} className={socialClass}>
                <InstagramIcon className="size-5" />
              </a>
            </li>
            <li>
              <a href={business.whatsappCommunityUrl} target="_blank" rel="noopener noreferrer" aria-label={contact.community} className={socialClass}>
                <UsersRound aria-hidden="true" strokeWidth={1.8} className="size-5" />
              </a>
            </li>
          </ul>
        </div>

        <div className="grid gap-1 border-t border-white/10 pt-4">
          {/* Services: one row on wide screens, two columns on phones */}
          <nav aria-label={copy.services}>
            <ul className="grid grid-cols-2 gap-x-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-0">
              {services.map((service, index) => (
                <li key={service.anchor} className="flex items-center">
                  {index ? (
                    <span aria-hidden="true" className="hidden px-3 text-highlight/70 sm:inline">
                      ·
                    </span>
                  ) : null}
                  <a href={pagePath(locale, "services", service.anchor)} className={cn(linkClass, "font-medium text-white")}>
                    {service.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact details */}
          <ul aria-label={copy.contact} className="flex flex-col gap-x-7 sm:flex-row sm:flex-wrap sm:items-center">
            {callNumbers.map((number) => (
              <li key={number.e164}>
                <a href={`tel:${number.e164}`} className={linkClass}>
                  <Phone aria-hidden="true" strokeWidth={1.8} className="size-4 text-highlight" />
                  <span className="sr-only">{contact.call}: </span>
                  {number.display}
                </a>
              </li>
            ))}
            <li className="min-w-0">
              <a href={`mailto:${business.email}`} className={cn(linkClass, "break-all")}>
                <Mail aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0 text-highlight" />
                <span className="sr-only">{contact.email}: </span>
                {business.email}
              </a>
            </li>
            <li className="inline-flex min-h-10 items-center gap-2 text-[0.9375rem] text-white/80">
              <MapPin aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0 text-highlight" />
              {formatLocation(locale)}
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom strip; padded on the right so the floating WhatsApp button never covers a link */}
      <div className="border-t border-white/10">
        <div className={cn(shell, "flex flex-col gap-0.5 py-2 pr-20 text-[0.8125rem] text-white/60 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pr-24")}>
          <p>
            © {new Date().getFullYear()} {business.localName[locale]}. {copy.rights}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5">
            <li>
              <a href={pagePath(locale, "contact")} className={cn("inline-flex min-h-10 items-center font-medium text-white/75 hover:text-white", focusRing)}>
                {nav.contact}
              </a>
            </li>
            <li>
              <a href={pagePath(locale, "plan")} className={cn("inline-flex min-h-10 items-center font-medium text-white/75 hover:text-white", focusRing)}>
                {nav.plan}
              </a>
            </li>
            <li>
              <a href="#top" className={cn("inline-flex min-h-10 items-center gap-1.5 font-semibold text-white/75 hover:text-white", focusRing)}>
                {copy.backToTop}
                <ArrowUp aria-hidden="true" strokeWidth={2} className="size-4" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
