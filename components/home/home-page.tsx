import { CtaSection } from "@/components/home/cta-section"
import { DestinationsSection } from "@/components/home/destinations-section"
import { GalleryPreview } from "@/components/home/gallery-preview"
import { Hero } from "@/components/home/hero"
import { OffersSection } from "@/components/home/offers-section"
import { QuickJourneys } from "@/components/home/quick-journeys"
import { ReviewsPreview } from "@/components/home/reviews-preview"
import { TravellerSection } from "@/components/home/traveller-section"
import { WhyKalika } from "@/components/home/why-kalika"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { listLiveDestinations } from "@/server/cms/destinations"
import { listLiveOffers } from "@/server/cms/offers"
import { getLiveHero, getLiveTraveller } from "@/server/cms/sections-public"
import { listLiveServices } from "@/server/cms/services"
import { listFeaturedGallery } from "@/server/content/gallery"
import { listApprovedReviews } from "@/server/content/reviews"

/**
 * The brand introduction. Each section previews a page that tells the full
 * story. Admin-managed content (hero, offers, services, destinations,
 * Traveller, photos, reviews) replaces the built-in content only where the
 * admin has published something, so an empty CMS shows the designed site.
 */
export async function HomePage({ locale, dictionary, preview }: { locale: Locale; dictionary: Dictionary; preview: boolean }) {
  const copy = dictionary.home
  const pages = dictionary.pages
  const [featured, reviews, offers, hero, services, destinations, traveller] = await Promise.all([
    listFeaturedGallery(6, preview),
    listApprovedReviews(3),
    listLiveOffers(locale, preview, dictionary.cms.offers.cta),
    getLiveHero(preview),
    listLiveServices(locale, preview),
    listLiveDestinations(locale, preview),
    getLiveTraveller(locale, preview),
  ])

  return (
    <>
      <Hero locale={locale} copy={copy.hero} services={dictionary.services} overrides={hero} />
      <OffersSection locale={locale} copy={dictionary.cms} whatsappLabel={dictionary.nav.whatsapp} offers={offers} />
      <QuickJourneys locale={locale} copy={copy.journeys} managed={services} />
      <WhyKalika locale={locale} copy={copy.why} />
      <TravellerSection locale={locale} copy={copy.traveller} moreLabel={pages.common.meetTheTraveller} managed={traveller} />
      <DestinationsSection locale={locale} copy={copy.destinations} exploreLabel={pages.common.exploreDestinations} managed={destinations} />
      <GalleryPreview locale={locale} copy={pages.gallery} viewAll={pages.common.viewAllPhotos} items={featured} />
      <ReviewsPreview locale={locale} copy={pages.reviews} tripTypes={pages.gallery.tripTypes} readAll={pages.common.readAllReviews} reviews={reviews} />
      <CtaSection locale={locale} copy={copy.cta} />
    </>
  )
}
