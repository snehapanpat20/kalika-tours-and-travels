import Link from "next/link"
import { ArrowUpRight, Bus } from "lucide-react"
import { journeyOrder, serviceIcons, type Icon } from "@/components/home/home-content"
import { ArrowLink, LandingHeading } from "@/components/home/landing/landing-heading"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { focusRing, shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { PublicService } from "@/server/cms/services"

/**
 * The kinds of trip we run, as icon cards: the services managed in the admin
 * panel, or the built-in five (family, group, pilgrimage, corporate,
 * outstation), plus hiring the Traveller itself. Nothing the business doesn't
 * offer (hotels, cabs) is listed. Each card links to its part of the Services
 * page; the hire card to the Traveller page.
 */
export function ServicesTeaser({
  locale,
  copy,
  journeys,
  managed,
}: {
  locale: Locale
  copy: Dictionary["home"]["landing"]["services"]
  journeys: Dictionary["home"]["journeys"]
  managed: PublicService[] | null
}) {
  const items: { key: string; href: string; title: string; body: string; Icon: Icon }[] = [
    ...(managed
      ? managed.map((service) => ({
          key: service.id,
          href: pagePath(locale, "services", service.anchor),
          title: service.title,
          body: service.shortDescription,
          Icon: serviceIcons[service.planService],
        }))
      : journeyOrder.map((id) => ({
          key: id,
          href: pagePath(locale, "services", id),
          title: journeys.items[id].title,
          body: journeys.items[id].body,
          Icon: serviceIcons[id],
        }))),
    { key: "rental", href: pagePath(locale, "traveller"), title: copy.rental.title, body: copy.rental.body, Icon: Bus },
  ]

  return (
    <section aria-labelledby="services-teaser-title" className="bg-ivory py-(--spacing-section)">
      <div className={shell}>
        <Reveal y={24}>
          <LandingHeading
            id="services-teaser-title"
            eyebrow={copy.eyebrow}
            lead={copy.lead}
            accent={copy.accent}
            description={copy.description}
            action={<ArrowLink href={pagePath(locale, "services")}>{copy.viewAll}</ArrowLink>}
          />
        </Reveal>

        <Stagger as="ul" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ key, href, title, body, Icon }) => (
            <StaggerItem as="li" key={key}>
              <Link
                href={href}
                className={cn(
                  "lift-card group relative flex h-full flex-col rounded-[1.5rem] border border-highlight/45 bg-white p-7 shadow-soft hover:border-highlight",
                  focusRing,
                )}
              >
                <span aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-t-full rounded-b-2xl bg-stone text-coral ring-1 ring-highlight/50">
                  <Icon strokeWidth={1.6} className="size-6" />
                </span>
                <span className="mt-6 block font-display text-[1.625rem] leading-tight font-semibold text-forest">{title}</span>
                <span className="mt-2 block leading-relaxed text-muted">{body}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="absolute top-7 right-7 size-5 text-highlight transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
