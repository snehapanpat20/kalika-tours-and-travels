import { Hero } from "@/components/home/hero"
import { OffersSection } from "@/components/home/offers-section"
import { QuickJourneys } from "@/components/home/quick-journeys"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { listLiveOffers } from "@/server/cms/offers"
import { getLiveHero } from "@/server/cms/sections-public"
import { listLiveServices } from "@/server/cms/services"

/**
 * A short introduction: who we are, any current offer, the kinds of trip we
 * run, and the way to the trip planner. The detail is on its own pages (About,
 * Services, Destinations, Our Traveller, Gallery, Reviews), which the header
 * and footer link to. Admin-managed content (hero, offers, services) replaces
 * the built-in content only where the admin has published something.
 */
export async function HomePage({ locale, dictionary, preview }: { locale: Locale; dictionary: Dictionary; preview: boolean }) {
  const copy = dictionary.home
  const [offers, hero, services] = await Promise.all([
    listLiveOffers(locale, preview, dictionary.cms.offers.cta),
    getLiveHero(preview),
    listLiveServices(locale, preview),
  ])

  return (
    <>
      <Hero locale={locale} copy={copy.hero} servicesLabel={dictionary.pages.common.viewAllServices} overrides={hero} />
      <OffersSection locale={locale} copy={dictionary.cms} whatsappLabel={dictionary.nav.whatsapp} offers={offers} />
      <QuickJourneys locale={locale} copy={copy.journeys} viewAll={dictionary.pages.common.viewAllServices} managed={services} />
    </>
  )
}
