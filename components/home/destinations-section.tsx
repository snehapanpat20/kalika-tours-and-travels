import { DestinationCard } from "@/components/home/destination-card"
import { DestinationRail } from "@/components/home/destination-rail"
import { destinationImages } from "@/components/home/home-content"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath, planPath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { PublicDestination } from "@/server/cms/destinations"
import type { DestinationId } from "@/types/home"

const order: DestinationId[] = ["maharashtra", "goa", "karnataka", "gujarat", "rajasthan", "madhya-pradesh", "north-india", "pilgrimage"]

const cardSize = "w-[82vw] shrink-0 aspect-[4/5] sm:w-[48vw] md:w-[40vw] lg:w-[26rem] xl:w-[28rem]"

/**
 * Stand-in for a managed destination without its own photo: a neutral open road,
 * never another place's photo (which would label the wrong location).
 */
const noPhoto = { category: "destinations" as const, name: "other" }

export function DestinationsSection({
  locale,
  copy,
  exploreLabel,
  managed,
}: {
  locale: Locale
  copy: Dictionary["home"]["destinations"]
  exploreLabel: string
  /** Destinations managed in the admin panel (the first ten); null keeps the built-in regions. */
  managed?: PublicDestination[] | null
}) {
  const cards = managed
    ? managed.slice(0, 10).map((item) => ({
        key: item.id,
        name: item.name,
        places: item.shortDescription,
        alt: item.image?.alt ?? "",
        image: item.image ? { src: item.image.url } : noPhoto,
      }))
    : order.map((id) => ({ key: id, name: copy.items[id].name, places: copy.items[id].places, alt: copy.items[id].alt, image: destinationImages[id] }))

  return (
    <section aria-labelledby="destinations-title" className="overflow-hidden bg-stone py-(--spacing-section)">
      <div className={shell}>
        <Reveal>
          <SectionHeading id="destinations-title" eyebrow={copy.eyebrow} title={copy.title} description={copy.description} className="md:pr-32" />
        </Reveal>
      </div>

      <div className="mt-10 md:mt-24">
        <DestinationRail label={copy.title} previous={copy.previous} next={copy.next}>
          {cards.map((item, index) => (
            <li key={item.key} className={cardSize}>
              <DestinationCard
                href={planPath(locale, { destination: item.name })}
                name={item.name}
                places={item.places}
                alt={item.alt}
                image={item.image}
                actionLabel={`${copy.plan.replace("{place}", item.name)}: ${item.places}`}
                index={index}
              />
            </li>
          ))}
          <li className={cn(cardSize)}>
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-panel bg-forest p-7 text-white sm:p-8">
              <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 bg-[repeating-linear-gradient(180deg,var(--color-teal-light)_0_14px,transparent_14px_26px)] opacity-25" />
              <p className="relative text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance sm:text-[2rem]">{copy.wherever.title}</p>
              <div className="relative">
                <p className="mb-6 max-w-xs leading-relaxed text-white/80">{copy.wherever.body}</p>
                <Button href={planPath(locale)} arrow className="w-full whitespace-normal sm:w-auto">
                  {copy.wherever.action}
                </Button>
              </div>
            </div>
          </li>
        </DestinationRail>
      </div>

      <div className={cn(shell, "mt-6")}>
        <Button href={pagePath(locale, "destinations")} variant="outline" arrow>
          {exploreLabel}
        </Button>
      </div>
    </section>
  )
}
