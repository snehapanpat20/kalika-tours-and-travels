import { travellerGallery, travellerImage, vehicleFeatureIcons } from "@/components/home/home-content"
import { TravellerViewer } from "@/components/home/traveller-viewer"
import { VehicleFeature } from "@/components/home/vehicle-feature"
import { cmsIcon } from "@/components/cms/cms-icon"
import { Photo, resolvePhoto } from "@/components/media/photo"
import { ImageReveal, Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { LiveTraveller } from "@/server/cms/sections-public"
import type { VehicleFeatureKey } from "@/types/home"

const featureOrder: VehicleFeatureKey[] = ["seats", "ac", "legroom", "luggage", "audio", "clean", "windows", "driver"]

export function TravellerSection({
  locale,
  copy,
  moreLabel,
  managed,
}: {
  locale: Locale
  copy: Dictionary["home"]["traveller"]
  moreLabel: string
  /** Features and photos from the admin panel; each falls back to the built-in set when empty. */
  managed?: LiveTraveller
}) {
  const photos =
    managed?.photos ??
    travellerGallery.map(({ id, image }) => ({
      id,
      ...resolvePhoto(image),
      alt: copy.gallery.items[id].alt,
      caption: copy.gallery.items[id].caption,
    }))
  const features =
    managed?.features?.map((feature, index) => ({ key: `${index}`, icon: cmsIcon(feature.icon), label: feature.label })) ??
    featureOrder.map((key) => ({ key, icon: vehicleFeatureIcons[key], label: copy.features[key] }))
  const mainPhoto = managed?.photos?.[0]

  return (
    <section
      aria-labelledby="traveller-title"
      className="relative isolate overflow-hidden bg-forest py-(--spacing-section) text-white"
    >
      {/* Quiet brand numeral in the background */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -bottom-16 -z-10 text-[clamp(12rem,30vw,30rem)] leading-none font-extrabold tracking-tighter text-white/[0.03] select-none"
      >
        20+1
      </p>

      <div className={cn(shell, "grid items-center gap-14 lg:grid-cols-12 lg:gap-10")}>
        <figure className="relative mb-8 lg:col-span-7 lg:mb-0">
          <ImageReveal className="relative aspect-[4/3.2] overflow-hidden rounded-panel bg-forest-soft">
            <Photo
              image={mainPhoto ? { src: mainPhoto.src } : travellerImage}
              alt={mainPhoto ? mainPhoto.alt : copy.imageAlt}
              sizes="(min-width: 1024px) 55vw, 100vw"
            />
          </ImageReveal>

          <Reveal delay={0.45} y={20} className="absolute -bottom-8 left-4 sm:left-8">
            <div className="rounded-card bg-ivory px-5 py-4 text-forest shadow-overlay sm:px-6 sm:py-5">
              <p className="text-5xl leading-none font-extrabold tracking-tighter sm:text-6xl">
                20<span className="text-coral">+</span>1
              </p>
              <p className="mt-2 text-sm font-bold">{copy.seater}</p>
              <p className="text-xs text-muted">{copy.capacity}</p>
            </div>
          </Reveal>
        </figure>

        <div className="lg:col-span-5 lg:pl-6">
          <Reveal>
            <SectionHeading id="traveller-title" inverse eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
          </Reveal>

          <h3 className="sr-only">{copy.featuresTitle}</h3>
          <Stagger as="ul" stagger={0.05} className="mt-9 grid grid-cols-1 gap-x-6 min-[420px]:grid-cols-2">
            {features.map((feature) => (
              <StaggerItem as="li" key={feature.key} className="border-b border-dashed border-white/12">
                <VehicleFeature icon={feature.icon} label={feature.label} />
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.1} className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TravellerViewer
              photos={photos}
              copy={{
                open: copy.view,
                title: copy.gallery.title,
                description: copy.gallery.description,
                close: copy.gallery.close,
                previous: copy.gallery.previous,
                next: copy.gallery.next,
                counter: copy.gallery.counter,
              }}
            />
            <Button href={pagePath(locale, "traveller")} variant="inverse" size="lg" arrow>
              {moreLabel}
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
