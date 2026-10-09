import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, MapPin } from "lucide-react"
import { journeyOrder, serviceIcons } from "@/components/home/home-content"
import { PageHero } from "@/components/layout/page-hero"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { JsonLd } from "@/components/seo/json-ld"
import { pageCrumbs } from "@/components/seo/page-structured-data"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { focusRing, shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { getSiteUrl } from "@/lib/config/site"
import { isLocale, type Locale } from "@/lib/i18n/locales"
import { destinationPath, pagePath, planPath } from "@/lib/routes"
import { defaultDestinationDescription, defaultDestinationTitle } from "@/lib/seo/destination-meta"
import { createPageMetadata } from "@/lib/seo/metadata"
import { graph, webPageSchema } from "@/lib/seo/structured-data"
import { cn } from "@/lib/utils/cn"
import { getLiveDestination, listLiveDestinations, type PublicDestination } from "@/server/cms/destinations"
import { isPreviewing } from "@/server/cms/preview"
import { getSiteDictionary } from "@/server/cms/site-content"
import type { ServiceId } from "@/types/catalog"

/**
 * One destination's own page. It exists only for a published destination with
 * a full write-up (see DESTINATION_PAGE_MIN_DESCRIPTION), so every page has
 * real content of its own; any other address is a 404.
 */

type Params = { params: Promise<{ locale: string; slug: string }> }

// Pages are made on first visit and refreshed with the rest of the site
export const dynamicParams = true
export function generateStaticParams() {
  return []
}

async function load({ params }: Params, preview: boolean) {
  const { locale, slug } = await params
  if (!isLocale(locale)) return null
  const destination = await getLiveDestination(locale, slug, preview)
  return destination ? { locale, destination } : null
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const found = await load(props, false)
  if (!found) return {}
  const { locale, destination } = found
  // The other language's page has the same address apart from the locale
  const metadata = await createPageMetadata(locale, null, {
    path: { en: destinationPath("en", destination.slug), mr: destinationPath("mr", destination.slug) },
    title: destination.seoTitle ?? defaultDestinationTitle(locale, destination.name),
    description: destination.seoDescription ?? defaultDestinationDescription(locale, destination.name, destination.shortDescription),
    image: destination.image
      ? { url: destination.image.url, width: destination.image.width, height: destination.image.height, alt: destination.image.alt || destination.name }
      : undefined,
  })
  return metadata
}

/** Every trip type fits any destination; pilgrimage places list pilgrimage first. */
function servicesFor(destination: PublicDestination): ServiceId[] {
  return destination.category === "PILGRIMAGE" ? ["pilgrimage", ...journeyOrder.filter((id) => id !== "pilgrimage")] : journeyOrder
}

const fill = (text: string, place: string) => text.replaceAll("{place}", place)

export default async function DestinationPage(props: Params) {
  const preview = await isPreviewing()
  const found = await load(props, preview)
  if (!found) notFound()
  const { locale, destination } = found
  const dictionary = await getSiteDictionary(locale, preview)
  const copy = dictionary.seo.destination
  const path = destinationPath(locale, destination.slug)
  const crumbs = pageCrumbs(locale, dictionary, "destinations", [{ name: destination.name, path }])
  const others = ((await listLiveDestinations(locale, preview)) ?? []).filter((item) => item.hasPage && item.id !== destination.id).slice(0, 6)

  const title = destination.seoTitle ?? defaultDestinationTitle(locale, destination.name)
  const description = destination.seoDescription ?? defaultDestinationDescription(locale, destination.name, destination.shortDescription)
  const url = `${getSiteUrl()}${path}`
  const place = {
    "@type": "TouristDestination",
    "@id": `${url}#destination`,
    name: destination.name,
    description: destination.shortDescription,
    ...(destination.state ? { containedInPlace: { "@type": "State", name: destination.state } } : {}),
    ...(destination.image ? { image: new URL(destination.image.url, getSiteUrl()).href } : {}),
  }

  return (
    <>
      <JsonLd
        data={graph([
          ...webPageSchema({ locale, path, title, description, image: destination.image?.url, crumbs }),
          place,
        ])}
      />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="destination-title"
        eyebrow={destination.state ?? copy.eyebrow}
        titleLead={destination.name}
        description={destination.shortDescription}
        image={destination.image ? { src: destination.image.url } : pageImages.destinationsHero}
        imageAlt={destination.image?.alt ?? ""}
        vivid={!destination.image}
        actions={
          <Button href={planPath(locale, { destination: destination.name })} size="lg" arrow className="w-full sm:w-auto">
            {fill(copy.planAction, destination.name)}
          </Button>
        }
      />

      <section aria-labelledby="about-destination-title" className="bg-ivory py-(--spacing-section)">
        <div className={cn(shell, "grid items-start gap-10 lg:grid-cols-12 lg:gap-14")}>
          <Reveal className="lg:col-span-7">
            <h2 id="about-destination-title" className="type-h2 text-forest">
              {fill(copy.aboutTitle, destination.name)}
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink/85">{destination.description}</p>
          </Reveal>
          <Reveal delay={0.08} className="lg:sticky lg:top-28 lg:col-span-5">
            <div className="rounded-panel bg-white p-6 shadow-card ring-1 ring-forest/5 sm:p-8">
              <h2 className="text-xl font-extrabold tracking-tight text-forest">{fill(copy.planTitle, destination.name)}</h2>
              <p className="mt-3 leading-relaxed text-muted">{copy.planBody}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button href={planPath(locale, { destination: destination.name })} arrow>
                  {dictionary.pages.common.planJourney}
                </Button>
                <Button href={pagePath(locale, "traveller")} variant="outline">
                  {dictionary.nav.traveller}
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <ServicesForPlace locale={locale} dictionary={dictionary} destination={destination} />

      <section aria-labelledby="more-destinations-title" className="bg-ivory py-(--spacing-section)">
        <div className={shell}>
          <Reveal>
            <h2 id="more-destinations-title" className="type-h3 text-forest">
              {copy.moreTitle}
            </h2>
          </Reveal>
          {others.length ? (
            <ul className="mt-6 flex flex-wrap gap-3">
              {others.map((item) => (
                <li key={item.id}>
                  <Link
                    href={destinationPath(locale, item.slug)}
                    className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-4 font-bold text-forest ring-1 ring-line transition hover:ring-teal", focusRing)}
                  >
                    <MapPin aria-hidden="true" className="size-4 text-coral" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Button href={pagePath(locale, "destinations")} variant="outline" arrow className="mt-8">
            {copy.backToAll}
          </Button>
        </div>
      </section>
    </>
  )
}

function ServicesForPlace({ locale, dictionary, destination }: { locale: Locale; dictionary: Dictionary; destination: PublicDestination }) {
  const items = dictionary.home.services.items
  return (
    <section aria-labelledby="destination-services-title" className="bg-stone py-(--spacing-section)">
      <div className={shell}>
        <Reveal>
          <SectionHeading id="destination-services-title" title={fill(dictionary.seo.destination.servicesTitle, destination.name)} />
        </Reveal>
        <Stagger as="ul" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {servicesFor(destination).map((id) => {
            const Icon = serviceIcons[id]
            return (
              <StaggerItem as="li" key={id}>
                <Link
                  href={planPath(locale, { service: id, destination: destination.name })}
                  className={cn(
                    "group flex h-full flex-col gap-3 rounded-card bg-white p-5 shadow-soft ring-1 ring-forest/6 transition hover:-translate-y-0.5 hover:ring-teal/40",
                    focusRing,
                  )}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-teal/10 text-teal-deep">
                    <Icon aria-hidden="true" strokeWidth={1.7} className="size-5" />
                  </span>
                  <span className="font-extrabold tracking-tight text-forest">{items[id].title}</span>
                  <span className="text-sm leading-relaxed text-muted">{items[id].body}</span>
                  <ArrowUpRight aria-hidden="true" className="mt-auto size-4 text-teal-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
