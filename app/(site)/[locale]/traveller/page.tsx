import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cmsIcon } from "@/components/cms/cms-icon"
import { ComfortSection } from "@/components/home/comfort-section"
import { journeyOrder, serviceIcons, travellerGallery, travellerImage, vehicleFeatureIcons } from "@/components/home/home-content"
import { VehicleFeature } from "@/components/home/vehicle-feature"
import { PageHero } from "@/components/layout/page-hero"
import { Photo, resolvePhoto } from "@/components/media/photo"
import { ImageReveal, Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { PhotoGrid } from "@/components/traveller/photo-grid"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { focusRing, shell } from "@/components/ui/styles"
import { FaqSection, travellerFaqs } from "@/components/seo/faq-section"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { pagePath, planPath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { travellerServiceSchema } from "@/lib/seo/structured-data"
import { cn } from "@/lib/utils/cn"
import { getLiveTraveller } from "@/server/cms/sections-public"
import type { VehicleFeatureKey } from "@/types/home"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "traveller") : {}
}

const featureOrder: VehicleFeatureKey[] = ["seats", "ac", "legroom", "luggage", "audio", "clean", "windows", "driver"]

export default async function TravellerPage(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "traveller")
  const copy = dictionary.pages.traveller
  const vehicle = dictionary.home.traveller
  const managed = await getLiveTraveller(locale, preview)

  // Admin-managed photos and features when set, otherwise the built-in ones
  const photos =
    managed.photos?.map(({ id, src, alt, caption }) => ({ id, src, alt, caption, position: undefined as string | undefined })) ??
    travellerGallery.flatMap(({ id, image }) => {
      const { src, position } = resolvePhoto(image)
      return src ? [{ id: id as string, src, position, alt: vehicle.gallery.items[id].alt, caption: vehicle.gallery.items[id].caption }] : []
    })
  const features =
    managed.features?.map((feature, index) => ({ key: `${index}`, icon: cmsIcon(feature.icon), label: feature.label })) ??
    featureOrder.map((key) => ({ key, icon: vehicleFeatureIcons[key], label: vehicle.features[key] }))
  const mainPhoto = managed.photos?.[0]

  return (
    <>
      <PageStructuredData locale={locale} page="traveller" crumbs={crumbs} extra={[travellerServiceSchema(locale)]} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="traveller-page-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.travellerHero}
        imageAlt={copy.imageAlt}
        actions={
          <Button href={planPath(locale)} size="lg" arrow className="w-full sm:w-auto">
            {dictionary.pages.common.planJourney}
          </Button>
        }
      />

      <section aria-labelledby="specs-title" className="relative isolate overflow-hidden bg-forest py-(--spacing-section) text-white">
        <div className={cn(shell, "grid items-center gap-14 lg:grid-cols-12 lg:gap-10")}>
          <div className="lg:col-span-5">
            <Reveal>
              <SectionHeading id="specs-title" inverse eyebrow={copy.specsEyebrow} title={copy.specsTitle} description={copy.specsBody} />
            </Reveal>
            <Reveal delay={0.1} className="mt-8 flex items-end gap-4">
              <p className="text-6xl leading-none font-extrabold tracking-tighter sm:text-7xl">
                20<span className="text-coral">+</span>1
              </p>
              <div className="pb-1 text-sm">
                <p className="font-bold">{copy.seatsLabel}</p>
                <p className="text-white/70">{copy.longDistance}</p>
              </div>
            </Reveal>
            <h3 className="sr-only">{vehicle.featuresTitle}</h3>
            <Stagger as="ul" stagger={0.05} className="mt-8 grid grid-cols-1 gap-x-6 min-[420px]:grid-cols-2">
              {features.map((feature) => (
                <StaggerItem as="li" key={feature.key} className="border-b border-dashed border-white/12">
                  <VehicleFeature icon={feature.icon} label={feature.label} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div className="lg:col-span-7 lg:pl-6">
            <ImageReveal className="relative aspect-[4/3.2] overflow-hidden rounded-panel bg-forest-soft">
              <Photo
                image={mainPhoto ? { src: mainPhoto.src } : travellerImage}
                alt={mainPhoto ? mainPhoto.alt : vehicle.imageAlt}
                sizes="(min-width: 1024px) 55vw, 100vw"
              />
            </ImageReveal>
          </div>
        </div>
      </section>

      <ComfortSection copy={dictionary.home.comfort} />

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

      <section aria-labelledby="photos-title" className="bg-ivory py-(--spacing-section)">
        <div className={shell}>
          <Reveal>
            <SectionHeading id="photos-title" eyebrow={copy.photosEyebrow} title={copy.photosTitle} description={copy.photosDescription} />
          </Reveal>
          <Reveal className="mt-10">
            <PhotoGrid
              photos={photos}
              openLabel={dictionary.pages.gallery.openPhoto}
              labels={{ close: vehicle.gallery.close, previous: vehicle.gallery.previous, next: vehicle.gallery.next, counter: vehicle.gallery.counter }}
            />
          </Reveal>
        </div>
      </section>

      <FaqSection id="traveller-faq-title" faqs={travellerFaqs(dictionary)} copy={dictionary.seo.faq} className="bg-stone" />
    </>
  )
}
