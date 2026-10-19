import type { VehicleView } from "@/components/fleet/fleet-view"
import { VehicleCard } from "@/components/fleet/vehicle-card"
import { ArrowLink, LandingHeading } from "@/components/home/landing/landing-heading"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { shell } from "@/components/ui/styles"
import { fleet } from "@/data/fleet"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"

/** Most vehicles the homepage shows. */
const FEATURED_MAX = 4

/**
 * "Explore Our Fleet": up to four featured vehicles (marked `featured` in
 * data/fleet.ts, the same list as the Our Fleet page) and a link to the page.
 */
export function ExploreFleet({ locale, dictionary, vehicles }: { locale: Locale; dictionary: Dictionary; vehicles: VehicleView[] }) {
  const copy = dictionary.fleet
  const featured = vehicles.filter((vehicle) => fleet.find((item) => item.id === vehicle.id)?.featured).slice(0, FEATURED_MAX)
  if (!featured.length) return null

  return (
    <section aria-labelledby="explore-fleet-title" className="bg-forest-deep py-(--spacing-section) text-white">
      <div className={shell}>
        <Reveal y={24}>
          <LandingHeading
            id="explore-fleet-title"
            eyebrow={copy.home.eyebrow}
            lead={copy.home.lead}
            accent={copy.home.accent}
            description={copy.home.description}
            tone="dark"
            action={
              <ArrowLink href={pagePath(locale, "traveller")} tone="dark">
                {copy.home.viewAll}
              </ArrowLink>
            }
          />
        </Reveal>
        <Stagger as="ul" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((vehicle) => (
            <StaggerItem as="li" key={vehicle.id}>
              <VehicleCard vehicle={vehicle} copy={copy} compact />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
