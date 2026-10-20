import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { FleetCatalogue } from "@/components/fleet/fleet-catalogue"
import { fleetViews, managedFleetViews } from "@/components/fleet/fleet-view"
import { journeyOrder, serviceIcons } from "@/components/home/home-content"
import { PageHero } from "@/components/layout/page-hero"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/ui/section-heading"
import { focusRing, shell } from "@/components/ui/styles"
import { FaqSection, fleetFaqs } from "@/components/seo/faq-section"
import { PageCTA } from "@/components/sections/page-cta"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { pagePath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { travellerServiceSchema } from "@/lib/seo/structured-data"
import { cn } from "@/lib/utils/cn"
import { fleetPageVehicles } from "@/data/fleet"
import { getLiveTraveller } from "@/server/cms/sections-public"
import { listLiveVehicles } from "@/server/cms/vehicles"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "traveller") : {}
}

/**
 * Our Fleet (at the Traveller page's address, so existing links keep
 * working): every vehicle from data/fleet.ts with filters, photos and an
 * enquiry link, then the kinds of trip they suit and the Traveller FAQs.
 * Only the business's own vehicle photos appear; the header has no photo.
 */
export default async function FleetPage(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "traveller")
  const copy = dictionary.pages.traveller
  const gallery = dictionary.home.traveller.gallery
  const [traveller, managed] = await Promise.all([getLiveTraveller(locale, preview), listLiveVehicles(locale, preview)])
  // The vehicles from Admin › Fleet (published ones only), or the built-in list until any are added there
  const vehicles = managed ? managedFleetViews(locale, dictionary, managed, traveller) : fleetViews(locale, dictionary, traveller, fleetPageVehicles)

  return (
    <>
      <PageStructuredData locale={locale} page="traveller" crumbs={crumbs} extra={[travellerServiceSchema(locale)]} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="traveller-page-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow || undefined}
        description={copy.description}
      />

      <section aria-label={dictionary.fleet.all} className="brand-palette bg-ivory py-(--spacing-section)">
        <div className={shell}>
          <FleetCatalogue
            vehicles={vehicles}
            copy={dictionary.fleet}
            galleryLabels={{ close: gallery.close, previous: gallery.previous, next: gallery.next, counter: gallery.counter }}
          />
        </div>
      </section>

      <section aria-labelledby="perfect-title" className="bg-stone py-(--spacing-section)">
        <div className={shell}>
          <Reveal>
            <SectionHeading id="perfect-title" eyebrow={copy.perfectForEyebrow} title={copy.perfectForTitle} />
          </Reveal>
          <Stagger as="ul" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {journeyOrder.map((id) => {
              const Icon = serviceIcons[id]
              return (
                <StaggerItem as="li" key={id}>
                  <Link
                    href={pagePath(locale, "services", id)}
                    className={cn(
                      "group flex h-full items-center gap-3 rounded-card bg-white p-5 shadow-soft ring-1 ring-forest/6 transition hover:-translate-y-0.5 hover:ring-teal/40 lg:flex-col lg:items-start",
                      focusRing,
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal/10 text-teal-deep">
                      <Icon aria-hidden="true" strokeWidth={1.7} className="size-5" />
                    </span>
                    <span className="flex-1 font-extrabold tracking-tight text-forest">{copy.perfectFor[id]}</span>
                    <ArrowUpRight aria-hidden="true" className="size-4 text-teal-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 lg:hidden" />
                  </Link>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </section>

      <FaqSection id="traveller-faq-title" faqs={fleetFaqs(dictionary, locale)} copy={dictionary.seo.faq} className="bg-ivory" />
      <PageCTA pageKey="traveller" locale={locale} dictionary={dictionary} />
    </>
  )
}
