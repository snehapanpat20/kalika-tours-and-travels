import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, MapPin } from "lucide-react"
import { CtaSection } from "@/components/home/cta-section"
import { destinationImages } from "@/components/home/home-content"
import { PageHero } from "@/components/layout/page-hero"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { ImageReveal, Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { builtInDestinationGroups, builtInPlaceImages } from "@/components/pages/destination-groups"
import { pageImages } from "@/components/pages/page-images"
import { Button } from "@/components/ui/button"
import { focusRing, shell } from "@/components/ui/styles"
import { photoCredits } from "@/data/photo-credits"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { isLocale, type Locale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { planPath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/utils/cn"
import { listLiveDestinations, type PublicDestination } from "@/server/cms/destinations"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "destinations") : {}
}

type PlaceView = { key: string; name: string; description: string; details: string | null; image: PhotoSource | null; alt: string }
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
function managedGroups(destinations: PublicDestination[], dictionary: Dictionary): GroupView[] {
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
          name: item.name,
          description: item.shortDescription,
          details: item.description,
          image: item.image ? { src: item.image.url } : null,
          alt: item.image?.alt ?? "",
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
      name: copy.places[id].name,
      description: copy.places[id].description,
      details: null,
      image: builtInPlaceImages[id] ?? null,
      alt: "",
    })),
  }))
}

export default async function DestinationsPage(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  const copy = dictionary.pages.destinations
  const planLabel = dictionary.pages.common.planATrip
  const managed = await listLiveDestinations(locale, preview)
  const groups = managed ? managedGroups(managed, dictionary) : builtInGroups(dictionary)

  return (
    <>
      <PageHero
        id="destinations-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.destinationsHero}
        vivid
        imageAlt={copy.imageAlt}
      />

      {groups.map((group, index) => {
        const withPhotos = group.places.some((place) => place.image)
        return (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-title`}
            className={cn("py-(--spacing-section)", index % 2 === 1 ? "bg-stone" : "bg-ivory")}
          >
            <div className={shell}>
              <Reveal className="max-w-2xl">
                <p className="eyebrow text-teal-deep">{group.eyebrow}</p>
                <h2 id={`${group.id}-title`} className="type-h2 mt-4 text-forest">
                  {group.title}
                </h2>
                <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted">{group.description}</p>
              </Reveal>

              {group.feature && !withPhotos ? (
                <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
                  <ImageReveal className="relative aspect-[4/3] overflow-hidden rounded-panel bg-stone-deep lg:col-span-5 lg:aspect-auto lg:min-h-full">
                    <Photo image={group.feature.image} alt={group.feature.alt} sizes="(min-width: 1024px) 38vw, 100vw" />
                  </ImageReveal>
                  <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
                    {group.places.map((place) => (
                      <StaggerItem as="li" key={place.key}>
                        <PlaceTile locale={locale} place={place} planLabel={planLabel} moreLabel={dictionary.cms.moreDetails} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              ) : (
                <Stagger as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.places.map((place) => (
                    <StaggerItem as="li" key={place.key}>
                      {place.image ? (
                        <Link
                          href={planPath(locale, { destination: place.name })}
                          className={cn("group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-card bg-forest-deep p-5 text-white sm:aspect-[3/4]", focusRing)}
                        >
                          <span className="zoom-img absolute inset-0 -z-10">
                            <Photo image={place.image} alt={place.alt} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 48vw, 100vw" />
                          </span>
                          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep/90 via-forest-deep/30 to-transparent" />
                          <span className="text-2xl font-extrabold tracking-tight">{place.name}</span>
                          <span className="mt-1.5 text-sm leading-relaxed text-white/80">{place.description}</span>
                          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-light">
                            {planLabel}
                            <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </Link>
                      ) : (
                        <PlaceTile locale={locale} place={place} planLabel={planLabel} moreLabel={dictionary.cms.moreDetails} tall />
                      )}
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          </section>
        )
      })}

      <section aria-labelledby="more-title" className="bg-ivory pb-(--spacing-section)">
        <div className={shell}>
          <Reveal className="flex flex-col items-start gap-5 rounded-panel border border-dashed border-line bg-stone px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div>
              <h2 id="more-title" className="text-xl font-extrabold tracking-tight text-forest sm:text-2xl">
                {copy.moreTitle}
              </h2>
              <p className="mt-2 max-w-xl text-muted">{copy.moreBody}</p>
            </div>
            <Button href={planPath(locale)} arrow>
              {dictionary.pages.common.planJourney}
            </Button>
          </Reveal>
        </div>
      </section>

      <CtaSection locale={locale} copy={dictionary.home.cta} />

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
    </>
  )
}

function PlaceTile({ locale, place, planLabel, moreLabel, tall = false }: { locale: Locale; place: PlaceView; planLabel: string; moreLabel: string; tall?: boolean }) {
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-forest/6 transition hover:-translate-y-0.5 hover:ring-teal/40",
        tall && "justify-end sm:aspect-[3/4]",
      )}
    >
      <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-forest">
        <MapPin aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0 text-coral" />
        {place.name}
      </span>
      <span className="mt-1.5 text-sm leading-relaxed text-muted">{place.description}</span>
      {place.details ? (
        <details className="mt-2 text-sm text-muted">
          <summary className={cn("cursor-pointer font-semibold text-teal-deep", focusRing)}>{moreLabel}</summary>
          <p className="mt-2 leading-relaxed whitespace-pre-line">{place.details}</p>
        </details>
      ) : null}
      {/* A separate link (not the whole tile), so "More details" can open on its own */}
      <Link
        href={planPath(locale, { destination: place.name })}
        className={cn("mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-teal-deep", focusRing)}
      >
        {planLabel}
        <span className="sr-only">: {place.name}</span>
        <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  )
}
