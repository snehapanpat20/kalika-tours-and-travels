import { travellerFeature } from "@/components/home/landing/landing-content"
import { ArrowLink, LandingHeading } from "@/components/home/landing/landing-heading"
import { Photo } from "@/components/media/photo"
import { ImageReveal, Reveal } from "@/components/motion/reveal"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { ServiceId } from "@/types/catalog"

/**
 * Our Traveller, the vehicle every Kalika trip runs in, with a link to its
 * page ("Our Traveller"). The brief imagined a customer group photo and quote
 * here; the site has none that customers have approved, so it shows our own
 * Traveller and the page's real description instead of a stand-in group or an
 * invented quote.
 */
export function FeaturedTravellers({
  locale,
  copy,
  traveller,
}: {
  locale: Locale
  copy: Dictionary["home"]["landing"]["traveller"]
  traveller: Dictionary["pages"]["traveller"]
}) {
  const uses = Object.entries(traveller.perfectFor) as [ServiceId, string][]

  return (
    <section aria-labelledby="traveller-feature-title" className="bg-forest-deep py-(--spacing-section) text-white">
      <div className={cn(shell, "grid items-center gap-12 lg:grid-cols-12 lg:gap-14")}>
        <div className="lg:col-span-7">
          <ImageReveal className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-forest shadow-card ring-1 ring-highlight/30 sm:aspect-[16/10]">
            <Photo image={travellerFeature} alt={traveller.imageAlt} sizes="(min-width: 1024px) 55vw, 100vw" />
          </ImageReveal>
        </div>

        <Reveal y={24} className="lg:col-span-5">
          <LandingHeading id="traveller-feature-title" eyebrow={copy.eyebrow} lead={copy.lead} accent={copy.accent} tone="dark" />
          <blockquote className="mt-6 border-l-2 border-highlight pl-5 font-display text-[1.375rem] leading-snug text-white/90 italic">
            {traveller.description}
          </blockquote>
          <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-teal-light uppercase">{copy.perfectFor}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {uses.map(([key, label]) => (
              <li key={key} className="rounded-full border border-white/20 px-3.5 py-1.5 text-sm text-white/85">
                {label}
              </li>
            ))}
          </ul>
          <ArrowLink href={pagePath(locale, "traveller")} tone="dark" className="mt-8">
            {copy.link}
          </ArrowLink>
        </Reveal>
      </div>
    </section>
  )
}
