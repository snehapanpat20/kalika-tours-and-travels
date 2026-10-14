import { aboutPhotos } from "@/components/home/landing/landing-content"
import { CountUp } from "@/components/home/landing/count-up"
import { ArrowLink } from "@/components/home/landing/landing-heading"
import { Photo } from "@/components/media/photo"
import { Reveal } from "@/components/motion/reveal"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

/**
 * "Who we are": the first lines of our story (from the About page), a link to
 * it, two overlapping arch-framed photos, and a row of numbers. The numbers
 * are facts the site already states or counts: the Traveller's seats, the
 * places listed on the Destinations page and the kinds of trip on the
 * Services page. No invented traveller counts or years.
 */
export function AboutTeaser({
  locale,
  copy,
  story,
  places,
  trips,
}: {
  locale: Locale
  copy: Dictionary["home"]["landing"]["about"]
  /** The About page's story paragraphs; the first one is shown. */
  story: string[]
  /** How many destinations the Destinations page lists. */
  places: number
  /** How many kinds of trip the Services page lists. */
  trips: number
}) {
  const stats = [
    { key: "seats", value: 20, suffix: "+1", label: copy.stats.seats },
    { key: "places", value: places, suffix: "", label: copy.stats.places },
    { key: "trips", value: trips, suffix: "", label: copy.stats.trips },
  ]

  return (
    <section aria-labelledby="about-teaser-title" className="bg-stone py-(--spacing-section)">
      <div className={cn(shell, "grid items-center gap-14 lg:grid-cols-12 lg:gap-10")}>
        <Reveal y={24} className="lg:col-span-6">
          <p className="eyebrow text-teal-deep">{copy.eyebrow}</p>
          <h2 id="about-teaser-title" className="type-h2 mt-4 text-forest">
            {copy.title}
          </h2>
          <p className="mt-6 max-w-xl text-[1.125rem] leading-relaxed text-ink/85">{story[0]}</p>
          <ArrowLink href={pagePath(locale, "about")} className="mt-4">
            {copy.link}
          </ArrowLink>

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-highlight/40 pt-8">
            {stats.map((stat) => (
              <div key={stat.key}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-[clamp(2.25rem,1.6rem+2vw,3.25rem)] leading-none font-semibold text-coral">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </dd>
                <dd aria-hidden="true" className="mt-2 text-sm leading-snug text-muted">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal y={24} delay={0.1} className="lg:col-span-6">
          <div className="relative mx-auto max-w-md pb-16 sm:pb-20 lg:mr-0">
            <div className="arch-frame relative ml-auto aspect-[3/4] w-[78%] overflow-hidden bg-stone-deep shadow-card ring-1 ring-highlight/40">
              <Photo image={aboutPhotos.main} alt={copy.photoAlt} sizes="(min-width: 1024px) 26vw, 70vw" />
            </div>
            <div className="arch-frame absolute bottom-0 left-0 aspect-[3/4] w-[46%] overflow-hidden border-[6px] border-stone bg-stone-deep shadow-card">
              <Photo image={aboutPhotos.inset} alt={copy.insetAlt} sizes="(min-width: 1024px) 16vw, 42vw" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
