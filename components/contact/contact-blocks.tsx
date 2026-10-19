import { Suspense } from "react"
import { ArrowUpRight, ChevronDown, Mail, MapPin, Phone, UserRound, UsersRound } from "lucide-react"
import { PlanForm, PlanFormFromUrl } from "@/components/home/plan-form"
import { activeFleet } from "@/data/fleet"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons"
import { focusRing } from "@/components/ui/styles"
import { business, callNumbers, formatLocation } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import type { ServiceId } from "@/types/catalog"

/**
 * Contact building blocks shared by the Contact and Plan Your Trip pages.
 * Phone, email and links come only from data/business.ts.
 */

type ContactCopy = Dictionary["home"]["contact"]

/** Call (both lines), WhatsApp (main line only) and email. Large tap targets on phones. */
export function ContactActions({ copy, className }: { copy: ContactCopy; className?: string }) {
  const actions = [
    { key: "whatsapp", label: copy.whatsapp, value: business.phone, href: business.whatsappUrl, icon: <WhatsAppIcon className="size-5" /> },
    { key: "email", label: copy.email, value: business.email, href: `mailto:${business.email}`, icon: <Mail aria-hidden="true" strokeWidth={1.8} className="size-5" /> },
  ]
  return (
        <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-1", className)}>
          <li className="col-span-2 sm:col-span-1">
            <div className="flex h-full items-center gap-4 rounded-card bg-ivory p-4 ring-1 ring-line">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal-deep">
                <Phone aria-hidden="true" strokeWidth={1.8} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">{copy.call}</p>
                <p className="flex flex-wrap items-center text-base font-bold text-forest">
                  {callNumbers.map((number, index) => (
                    <span key={number.e164} className="inline-flex items-center">
                      <a
                        href={`tel:${number.e164}`}
                        aria-label={`${copy.call} ${number.display}`}
                        className={cn("inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-teal-deep hover:underline", focusRing)}
                      >
                        {number.display}
                      </a>
                      {index < callNumbers.length - 1 ? <span aria-hidden="true" className="mr-2">,</span> : null}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </li>
          {actions.map((action) => (
            <li key={action.key}>
              <a
                href={action.href}
                {...(action.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "group flex h-full flex-col items-center gap-2 rounded-card bg-ivory px-2 py-4 text-center ring-1 ring-line transition duration-300 hover:bg-white hover:shadow-soft hover:ring-transparent sm:flex-row sm:gap-4 sm:p-4 sm:text-left",
                  focusRing,
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                    action.key === "whatsapp" ? "bg-whatsapp/12 text-whatsapp" : "bg-teal-soft text-teal-deep group-hover:bg-coral-soft group-hover:text-forest",
                  )}
                >
                  {action.icon}
                </span>
                <span className="w-full min-w-0 flex-1">
                  <span className="block text-sm font-bold text-forest sm:text-xs sm:font-semibold sm:tracking-[0.12em] sm:text-muted sm:uppercase">{action.label}</span>
                  <span className="block truncate text-xs font-semibold text-muted sm:text-base sm:font-bold sm:text-forest">{action.value}</span>
                </span>
                <ArrowUpRight aria-hidden="true" strokeWidth={2} className="nudge hidden size-5 text-coral sm:block" />
              </a>
            </li>
          ))}
        </ul>
  )
}

/** Owner, location, Instagram and the WhatsApp community. */
export function ContactDetails({ locale, copy }: { locale: Locale; copy: ContactCopy }) {
  return (
    <div>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="flex gap-3">
              <UserRound aria-hidden="true" strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-teal-deep" />
              <div>
                <dt className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">{copy.owner}</dt>
                <dd className="mt-1 font-bold text-forest">{business.owner}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin aria-hidden="true" strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-teal-deep" />
              <div>
                <dt className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">{copy.location}</dt>
                <dd className="mt-1 font-bold text-forest">
                  {business.name}
                  <span className="block font-medium text-muted">{formatLocation(locale)}</span>
                </dd>
              </div>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-ivory px-4 text-sm font-bold text-forest ring-1 ring-line hover:bg-white", focusRing)}
            >
              <InstagramIcon className="size-[1.125rem] text-coral" />
              {copy.instagram}
            </a>
            <a
              href={business.whatsappCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-ivory px-4 text-sm font-bold text-forest ring-1 ring-line hover:bg-white", focusRing)}
            >
              <UsersRound aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem] text-whatsapp" />
              {copy.community}
              <span className="sr-only">: {copy.communityBody}</span>
            </a>
          </div>
    </div>
  )
}

/** The business's own trip terms, folded away until needed. */
export function TripTerms({ copy, rules, className }: { copy: ContactCopy; rules: Dictionary["rules"]; className?: string }) {
  const terms = [rules.customPricing, rules.bookingIsRequest, rules.oneWay, rules.nightTravel, rules.extras, rules.noCancellation, rules.noRefund]
  return (
        <details className={cn("group rounded-card bg-ivory ring-1 ring-line", className)}>
          <summary
            className={cn(
              "flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 text-sm font-bold text-forest [&::-webkit-details-marker]:hidden",
              focusRing,
            )}
          >
            {copy.termsTitle}
            <ChevronDown aria-hidden="true" strokeWidth={2} className="size-4 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <ul className="grid gap-2.5 px-5 pb-5 text-sm leading-6 text-muted">
            {terms.map((term) => (
              <li key={term} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-coral" />
                {term}
              </li>
            ))}
          </ul>
        </details>
  )
}

/** The trip enquiry form in its card. Posts to the existing /api/enquiries. */
export function PlanFormCard({
  locale,
  dictionary,
  services,
  headingLevel = "h2",
}: {
  locale: Locale
  dictionary: Dictionary
  services: { id: ServiceId; name: string }[]
  headingLevel?: "h2" | "h3"
}) {
  const plan = dictionary.home.plan
  // The vehicles from data/fleet.ts, named in the visitor's language and in English (for the business)
  const english = getDictionary("en").fleet.vehicles
  const vehicles = activeFleet.map((vehicle) => ({ id: vehicle.id, name: dictionary.fleet.vehicles[vehicle.id].name, english: english[vehicle.id].name }))
  const formProps = { locale, copy: plan, services, vehicles, oneWay: dictionary.rules.oneWay }
  const Heading = headingLevel
  return (
    <div id="plan" aria-labelledby="plan-title" role="region" className="rounded-panel bg-white p-6 shadow-card ring-1 ring-forest/5 sm:p-8 lg:p-10">
      <p className="eyebrow text-teal-deep">{plan.eyebrow}</p>
      <Heading id="plan-title" className="mt-3 text-[1.75rem] leading-tight font-extrabold tracking-tight text-forest sm:text-3xl">
        {plan.title}
      </Heading>
      <p className="mt-3 max-w-lg leading-relaxed text-muted">{plan.description}</p>
      <div className="mt-8">
        <Suspense fallback={<PlanForm {...formProps} />}>
          <PlanFormFromUrl {...formProps} />
        </Suspense>
      </div>
    </div>
  )
}
