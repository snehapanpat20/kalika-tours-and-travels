import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { journeyOrder, serviceIcons } from "@/components/home/home-content"
import { Reveal } from "@/components/motion/reveal"
import { focusRing, shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { PublicService } from "@/server/cms/services"

/**
 * A short row naming the kinds of trip we run: the services managed in the
 * admin panel, or the built-in ones. Each links to its part of the Services
 * page, where the detail lives.
 */
export function QuickJourneys({
  locale,
  copy,
  viewAll,
  managed,
}: {
  locale: Locale
  copy: Dictionary["home"]["journeys"]
  /** Label of the link to the Services page. */
  viewAll: string
  managed?: PublicService[] | null
}) {
  const items = managed
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
        title: copy.items[id].title,
        body: copy.items[id].body,
        Icon: serviceIcons[id],
      }))

  return (
    <section id="journeys" aria-labelledby="journeys-title" className="bg-ivory py-16 sm:py-20">
      <Reveal className={shell} y={16}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 id="journeys-title" className="type-h2 max-w-2xl text-forest">
            {copy.title}
          </h2>
          <Link
            href={pagePath(locale, "services")}
            className={cn("group inline-flex min-h-11 items-center gap-2 font-medium text-teal-deep underline-offset-4 hover:underline", focusRing)}
          >
            {viewAll}
            <ArrowRight aria-hidden="true" strokeWidth={2} className="nudge size-4" />
          </Link>
        </div>

        <ul className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:mt-10 lg:flex lg:gap-x-8">
          {items.map(({ key, href, title, body, Icon }) => (
            <li key={key} className="border-t border-line lg:flex-1">
              <Link href={href} className={cn("group flex h-full items-start gap-3.5 py-4 lg:flex-col lg:gap-4 lg:py-5", focusRing)}>
                <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-soft text-forest transition-colors group-hover:bg-stone-deep">
                  <Icon strokeWidth={1.7} className="size-5" />
                </span>
                <span>
                  <span className="block font-display text-[1.375rem] leading-tight font-semibold text-forest underline-offset-4 group-hover:underline">{title}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}
