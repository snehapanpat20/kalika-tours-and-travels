import type { Metadata } from "next"
import Link from "next/link"
import { destinationImages } from "@/components/home/home-content"
import { PageHero } from "@/components/layout/page-hero"
import { resolvePhoto, type PhotoSource } from "@/components/media/photo"
import { Reveal } from "@/components/motion/reveal"
import { builtInDestinationGroups, builtInPlaceImages } from "@/components/pages/destination-groups"
import { pageImages } from "@/components/pages/page-images"
import { upcomingTours } from "@/components/pages/upcoming-tours"
import { Button } from "@/components/ui/button"
import { CoverflowCarousel, type CoverflowItem } from "@/components/ui/coverflow-carousel"
import { PolaroidLineCarousel, type PolaroidSlide } from "@/components/ui/polaroid-line-carousel"
import { focusRing, shell } from "@/components/ui/styles"
import { PageCTA } from "@/components/sections/page-cta"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { photoCredits } from "@/data/photo-credits"
import { slugify } from "@/lib/cms/slug"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { isLocale, type Locale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { destinationPath, planPath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/utils/cn"
import { listLiveDestinations, type PublicDestination } from "@/server/cms/destinations"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "destinations") : {}
}

type PlaceView = {
  key: string
  /** Stable id: the destination's web address, or the built-in place's id. */
  slug: string
  name: string
  description: string
  details: string | null
  image: PhotoSource | null
  alt: string
  /** The destination's own page, when it has one. */
  page: string | null
}
type GroupView = {
  id: string
  eyebrow: string
  title: string
  description: string
  /** Large photo beside the place tiles, used when the places have no photos of their own. */
  feature: { image: PhotoSource; alt: string } | null
  places: PlaceView[]
}

const categoryOrder: PublicDestination["category"][] = ["MAHARASHTRA", "OTHER_STATES", "PILGRIMAGE", "FAMILY", "GROUP", "OUTSTATION", "CORPORATE"]

/** Destinations managed in the admin panel, grouped by category. */
function managedGroups(locale: Locale, destinations: PublicDestination[], dictionary: Dictionary): GroupView[] {
  const copy = dictionary.pages.destinations
  return categoryOrder.flatMap((category): GroupView[] => {
    const places = destinations.filter((item) => item.category === category)
    if (!places.length) return []
    const builtIn = category === "MAHARASHTRA" ? copy.groups.maharashtra : category === "OTHER_STATES" ? copy.groups.beyond : category === "PILGRIMAGE" ? copy.groups.pilgrimage : null
    const heading = builtIn ?? dictionary.cms.destinationCategories[category as keyof Dictionary["cms"]["destinationCategories"]]
    const featureImage = category === "MAHARASHTRA" ? destinationImages.maharashtra : category === "PILGRIMAGE" ? destinationImages.pilgrimage : null
    return [
      {
        id: category.toLowerCase().replace("_", "-"),
        eyebrow: heading.eyebrow,
        title: heading.title,
        description: heading.description,
        feature: featureImage && builtIn ? { image: featureImage, alt: builtIn.imageAlt } : null,
        places: places.map((item) => ({
          key: item.id,
          slug: item.slug,
          name: item.name,
          description: item.shortDescription,
          details: item.description,
          image: item.image ? { src: item.image.url } : null,
          alt: item.image?.alt ?? "",
          page: item.hasPage ? destinationPath(locale, item.slug) : null,
        })),
      },
    ]
  })
}

/** The destinations the website shows when none are managed in the admin panel. */
function builtInGroups(dictionary: Dictionary): GroupView[] {
  const copy = dictionary.pages.destinations
  return builtInDestinationGroups.map((group) => ({
    id: group.id,
    eyebrow: copy.groups[group.id].eyebrow,
    title: copy.groups[group.id].title,
    description: copy.groups[group.id].description,
    feature: group.image ? { image: group.image, alt: copy.groups[group.id].imageAlt } : null,
    places: group.places.map((id) => ({
      key: id,
      slug: id,
      name: copy.places[id].name,
      description: copy.places[id].description,
      details: null,
      image: builtInPlaceImages[id] ?? null,
      alt: "",
      page: null,
    })),
  }))
}

export default async function DestinationsPage(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "destinations")
  const copy = dictionary.pages.destinations
  const planLabel = dictionary.pages.common.planATrip
  const managed = await listLiveDestinations(locale, preview)
  const groups = managed ? managedGroups(locale, managed, dictionary) : builtInGroups(dictionary)
  const famous = famousSlides(locale, groups, planLabel, dictionary.cms.moreDetails)
  // Places the admin added beyond the built-in ones: listed by name, so each stays reachable
  const added = managed ? addedPlaces(groups) : []
  const tours = upcomingTours.map(({ id, image }): CoverflowItem => {
    const photo = image ? resolvePhoto(image) : null
    return {
      id,
      image: photo?.src,
      position: photo?.position,
      title: copy.tours.items[id].name,
      meta: copy.tours.items[id].duration,
      description: copy.tours.items[id].description,
      href: planPath(locale, { destination: copy.tours.items[id].name }),
      linkLabel: copy.tours.enquire,
    }
  })

  return (
    <>
      <PageStructuredData locale={locale} page="destinations" crumbs={crumbs} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="destinations-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.destinationsHero}
        vivid
        imageAlt={copy.imageAlt}
      />

      {/* Tour packages, as a coverflow to swipe, click or step through */}
      <section aria-labelledby="tours-title" className="bg-ivory py-(--spacing-section)">
        <Reveal className={cn(shell, "text-center")}>
          <p className="eyebrow text-teal-deep">{copy.tours.eyebrow}</p>
          <h2 id="tours-title" className="type-h2 mt-4 text-forest">
            {copy.tours.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-muted">{copy.tours.description}</p>
        </Reveal>
        <CoverflowCarousel
          className="mt-6"
          items={tours}
          ariaLabel={copy.tours.eyebrow}
          previous={copy.tours.previous}
          next={copy.tours.next}
          counter={copy.tours.counter}
          loop
        />
      </section>

      {/* The well-known places, as one line of photographs to drag, click or step through */}
      {famous.length ? (
        <section aria-label={dictionary.home.destinations.eyebrow} className="bg-stone">
          <PolaroidLineCarousel
            slides={famous}
            ariaLabel={dictionary.home.destinations.title}
            previous={dictionary.home.destinations.previous}
            next={dictionary.home.destinations.next}
            counter={dictionary.pages.gallery.lightbox.counter}
          />
        </section>
      ) : null}

      <section aria-labelledby="more-title" className="bg-ivory py-(--spacing-section)">
        <div className={shell}>
          <Reveal className="flex flex-col items-start gap-5 rounded-panel border border-dashed border-line bg-stone px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div>
              <h2 id="more-title" className="text-xl font-extrabold tracking-tight text-forest sm:text-2xl">
                {copy.moreTitle}
              </h2>
              <p className="mt-2 max-w-xl text-muted">{copy.moreBody}</p>
              {added.length ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {added.map((place) => (
                    <li key={place.key}>
                      <Link
                        href={place.page ?? planPath(locale, { destination: place.name })}
                        className={cn("inline-flex min-h-11 items-center rounded-button bg-white px-4 text-sm font-medium text-forest ring-1 ring-forest/15 hover:ring-teal/50", focusRing)}
                      >
                        {place.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button href={planPath(locale)} arrow>
              {dictionary.pages.common.planJourney}
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Credits for photographs used under their licences */}
      <aside id="photo-credits" aria-label={dictionary.cms.photoCredits} className="bg-ivory py-6">
        <div className={cn(shell, "text-xs leading-5 text-muted")}>
          <span className="font-semibold">{dictionary.cms.photoCredits}:</span>{" "}
          {photoCredits.map((credit, index) => (
            <span key={credit.image}>
              {credit.subject} by{" "}
              <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-forest">
                {credit.author}
              </a>
              , <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-forest">{credit.licence}</a>
              {index < photoCredits.length - 1 ? " · " : null}
            </span>
          ))}
          {" "}(Wikimedia Commons)
        </div>
      </aside>
      <PageCTA pageKey="destinations" locale={locale} dictionary={dictionary} />
    </>
  )
}

/**
 * The well-known places shown in the photo carousel, in this order. A place is
 * matched by its web address (or built-in id), so it keeps its spot whatever
 * language the page is in.
 */
const famousPlaces = ["mahabaleshwar", "lonavala", "konkan", "ashtavinayak", "goa", "mumbai", "shirdi", "ujjain", "gujarat", "varanasi", "vrindavan", "rajasthan", "kerala"]

/** Managed places that are not one of the website's built-in ones (matched by web address). */
function addedPlaces(groups: GroupView[]): PlaceView[] {
  const names = getDictionary("en").pages.destinations.places
  const builtIn = new Set(builtInDestinationGroups.flatMap((group) => group.places.map((id) => slugify(names[id].name))))
  return groups.flatMap((group) => group.places).filter((place) => !builtIn.has(place.slug))
}

/** Slides for the photo carousel: the well-known places that have a photograph. */
function famousSlides(locale: Locale, groups: GroupView[], planLabel: string, moreLabel: string): PolaroidSlide[] {
  const places = groups.flatMap((group) => group.places)
  return famousPlaces.flatMap((slug): PolaroidSlide[] => {
    const place = places.find((item) => item.slug === slug)
    if (!place?.image) return []
    const photo = "src" in place.image ? place.image : resolvePhoto(place.image)
    if (!photo.src) return []
    return [
      {
        key: place.key,
        image: photo.src,
        position: photo.position,
        alt: place.alt,
        title: place.name,
        caption: place.description,
        href: place.page ?? planPath(locale, { destination: place.name }),
        linkLabel: place.page ? moreLabel : planLabel,
      },
    ]
  })
}
