import { journeyOrder, journeyVisuals } from "@/components/home/home-content"
import { JourneyCard } from "@/components/home/journey-card"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { PublicService } from "@/server/cms/services"

/** Journey cards: the services managed in the admin panel, or the five built-in journeys. */
export function QuickJourneys({ locale, copy, managed }: { locale: Locale; copy: Dictionary["home"]["journeys"]; managed?: PublicService[] | null }) {
  const cards = managed
    ? managed.map((service) => ({
        key: service.id,
        href: pagePath(locale, "services", service.anchor),
        title: service.title,
        body: service.shortDescription,
        alt: service.image?.alt ?? "",
        image: service.image ? { src: service.image.url } : journeyVisuals[service.planService],
      }))
    : journeyOrder.map((id) => ({
        key: id,
        href: pagePath(locale, "services", id),
        title: copy.items[id].title,
        body: copy.items[id].body,
        alt: copy.items[id].alt,
        image: journeyVisuals[id],
      }))

  return (
    <section id="journeys" aria-labelledby="journeys-title" className="bg-ivory pt-16 pb-(--spacing-section) sm:pt-20 lg:pt-24">
      <div className={shell}>
        <SectionHeading id="journeys-title" eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      </div>

      <Stagger
        as="ul"
        className={cn(
          "scroller rail mt-10 flex gap-4 overflow-x-auto pb-2 sm:mt-12",
          // Five cards fit one row; any other number keeps the scrolling rail
          cards.length === 5 && "lg:mx-auto lg:grid lg:max-w-[90rem] lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:px-12 2xl:px-16",
        )}
      >
        {cards.map((card, index) => (
          <StaggerItem as="li" key={card.key} className={cn("w-[78%] shrink-0 sm:w-[44%] md:w-[34%]", cards.length === 5 ? "lg:w-auto" : "lg:w-[19rem]")}>
            <JourneyCard href={card.href} title={card.title} body={card.body} alt={card.alt} image={card.image} index={index} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
