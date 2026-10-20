import { OffersSection } from "@/components/home/offers-section"
import { AboutTeaser } from "@/components/home/landing/about-teaser"
import { ExploreFleet } from "@/components/home/landing/explore-fleet"
import { Hero } from "@/components/home/landing/hero"
import {
  MIN_REVIEWS_FOR_AVERAGE,
  REVIEW_COUNT,
  aboutPhotos,
  heroSlides,
} from "@/components/home/landing/landing-content"
import { JaliDivider } from "@/components/home/landing/landing-heading"
import { ReviewsTeaser } from "@/components/home/landing/reviews-teaser"
import { ServicesTeaser } from "@/components/home/landing/services-teaser"
import { UpcomingTours } from "@/components/home/landing/upcoming-tours"
import { journeyOrder, type ImageRef } from "@/components/home/home-content"
import { fleetViews } from "@/components/fleet/fleet-view"
import { resolvePhoto } from "@/components/media/photo"
import { builtInDestinationGroups } from "@/components/pages/destination-groups"
import { upcomingTours } from "@/components/pages/upcoming-tours"
import { shell } from "@/components/ui/styles"
import { PageCTA } from "@/components/sections/page-cta"
import { photoCredits } from "@/data/photo-credits"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import { listLiveDestinations } from "@/server/cms/destinations"
import { listLiveOffers } from "@/server/cms/offers"
import { getLiveHero, getLiveTraveller } from "@/server/cms/sections-public"
import { listPublicVehicles } from "@/server/cms/vehicles"
import { listLiveServices } from "@/server/cms/services"
import { listApprovedReviews } from "@/server/content/reviews"

/**
 * The homepage: the hero, upcoming tour packages, who we are, our fleet,
 * the kinds of trip we run, the latest reviews, and the shared closing call to
 * action (components/sections/page-cta.tsx). Any current admin offer sits just
 * under the hero.
 *
 * Everything shown is real: admin-managed content (hero photo and text,
 * offers, services, destinations, approved reviews) where it
 * has been published, and the site's own copy and photos otherwise. No
 * departure dates, prices, seat counts or reviews are made up. The page's
 * colours are the homepage palette (`.home-landing` in globals.css); the
 * header and footer are shared with every page and unchanged.
 */
export async function HomePage({ locale, dictionary, preview }: { locale: Locale; dictionary: Dictionary; preview: boolean }) {
  const copy = dictionary.home
  const [offers, hero, services, destinations, reviews, traveller, vehicles] = await Promise.all([
    listLiveOffers(locale, preview, dictionary.cms.offers.cta),
    getLiveHero(preview),
    listLiveServices(locale, preview),
    listLiveDestinations(locale, preview),
    listApprovedReviews(),
    getLiveTraveller(locale, preview),
    // The same published vehicles as the Our Fleet page (Admin › Fleet), never a built-in list
    listPublicVehicles(locale, preview),
  ])

  // The average covers every approved review (as on the Reviews page); the carousel shows the latest few
  const rating =
    reviews.length >= MIN_REVIEWS_FOR_AVERAGE ? { average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length, count: reviews.length } : null
  const places = destinations ? destinations.length : builtInDestinationGroups.reduce((sum, group) => sum + group.places.length, 0)
  const trips = services ? services.length : journeyOrder.length

  return (
    <div className="home-landing">
      <Hero locale={locale} copy={copy.hero} landing={copy.landing.hero} overrides={hero} rating={rating} />
      <OffersSection locale={locale} copy={dictionary.cms} whatsappLabel={dictionary.nav.whatsapp} offers={offers} />
      <UpcomingTours locale={locale} copy={copy.landing.tours} tours={dictionary.pages.destinations.tours.items} />
      <AboutTeaser locale={locale} copy={copy.landing.about} vehicles={vehicles?.length ?? null} places={places} trips={trips} />
      <ExploreFleet locale={locale} dictionary={dictionary} vehicles={fleetViews(locale, dictionary, vehicles ?? [], traveller)} />
      <ServicesTeaser locale={locale} copy={copy.landing.services} journeys={copy.journeys} managed={services} />
      <JaliDivider className="bg-ivory" />
      <ReviewsTeaser locale={locale} dictionary={dictionary} reviews={reviews.slice(0, REVIEW_COUNT)} />
      <HomePhotoCredits label={dictionary.cms.photoCredits} />
      <PageCTA pageKey="home" locale={locale} dictionary={dictionary} />
    </div>
  )
}

/** Every bundled photo the homepage can show, to find the ones that need a credit. */
const homeImages: ImageRef[] = [
  ...heroSlides.map((slide) => slide.image),
  ...upcomingTours.flatMap((tour) => (tour.image ? [tour.image] : [])),
  aboutPhotos.main,
  aboutPhotos.inset,
]

/** Credits for photographs by other people that appear on this page, as their licences require. */
function HomePhotoCredits({ label }: { label: string }) {
  const used = new Set(homeImages.map((image) => resolvePhoto(image).src))
  const credits = photoCredits.filter((credit) => used.has(credit.image))
  if (!credits.length) return null

  return (
    <aside aria-label={label} className="bg-ivory py-6">
      <div className={cn(shell, "text-xs leading-5 text-muted")}>
        <span className="font-semibold">{label}:</span>{" "}
        {credits.map((credit, index) => (
          <span key={credit.image}>
            {credit.subject} by{" "}
            <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-forest">
              {credit.author}
            </a>
            ,{" "}
            <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-forest">
              {credit.licence}
            </a>
            {index < credits.length - 1 ? " · " : null}
          </span>
        ))}{" "}
        (Wikimedia Commons)
      </div>
    </aside>
  )
}
