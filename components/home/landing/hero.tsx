import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight, Armchair, MapPin, MessageCircle, Star } from "lucide-react"
import type { HeroOverrides } from "@/components/home/hero"
import { HERO_SLIDE_SECONDS, heroSlides } from "@/components/home/landing/landing-content"
import { HeroBackground, HeroSlideControls, HeroSlideshow, type HeroSlide } from "@/components/home/landing/hero-slides"
import { resolvePhoto } from "@/components/media/photo"
import { Button } from "@/components/ui/button"
import { focusRing, shell } from "@/components/ui/styles"
import { business } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

/** When an element joins the CSS load sequence in globals.css, in ms after the page appears. */
const at = (ms: number) => ({ "--d": ms }) as CSSProperties

/**
 * The homepage opening, full height and running under the (transparent)
 * header: a slow slideshow of photographs, the brand name in cream and gold,
 * the tagline, the way to the trip planner, a planning card, a strip of
 * verified facts and a cue to scroll.
 *
 * Kalika publishes no fixed departures, so the "Next departure" card invites
 * an enquiry instead of showing invented dates or seats.
 */
export function Hero({
  locale,
  copy,
  landing,
  overrides = {},
  rating,
}: {
  locale: Locale
  /** The hero's editable text: eyebrow, tagline (titleLead + titleFollow), button and photo description. */
  copy: Dictionary["home"]["hero"]
  landing: Dictionary["home"]["landing"]["hero"]
  overrides?: HeroOverrides
  /** Average of all approved reviews; null below the minimum count (as on the Reviews page). */
  rating: { average: number; count: number } | null
}) {
  const [first, ...rest] = business.localName[locale].split(" ")

  const slides = heroSlides.flatMap(({ id, image }, index): HeroSlide[] => {
    // An admin-chosen hero photo replaces the first slide
    const source = index === 0 && overrides.image ? overrides.image : image
    const resolved = "src" in source ? source : resolvePhoto(source)
    if (!resolved.src) return []
    const copyFor = landing.slides[id]
    return [{ id, src: resolved.src, position: resolved.position, alt: index === 0 && overrides.image ? copy.imageAlt : copyFor.alt, place: copyFor.place }]
  })

  const trust = [
    { key: "seats", Icon: Armchair, text: landing.trust.seats },
    { key: "base", Icon: MapPin, text: landing.trust.base },
    { key: "direct", Icon: MessageCircle, text: landing.trust.direct },
    ...(rating
      ? [{ key: "rating", Icon: Star, text: landing.trust.rating.replace("{rating}", rating.average.toFixed(1)).replace("{count}", String(rating.count)) }]
      : []),
  ]

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate -mt-[calc(4rem+var(--announcement-h,0px))] flex min-h-[max(40rem,100svh)] flex-col overflow-hidden bg-forest-deep text-white lg:-mt-[calc(5rem+var(--announcement-h,0px))]"
    >
      <HeroSlideshow slides={slides} seconds={HERO_SLIDE_SECONDS}>
      <HeroBackground />
      <div aria-hidden="true" className="landing-hero-veil absolute inset-0 -z-10" />

      <div className={cn(shell, "flex flex-1 flex-col pt-[calc(7rem+var(--announcement-h,0px))] pb-8 lg:pt-[calc(8.5rem+var(--announcement-h,0px))]")}>
        {/* The text: label, name, rule, tagline, buttons */}
        <div className="my-auto max-w-3xl">
          <p className="hero-up text-xs font-semibold tracking-[0.28em] text-teal-light uppercase sm:text-sm" style={at(100)}>
            {copy.eyebrow}
          </p>
          <h1 id="hero-title" className="mt-5 text-[clamp(3.75rem,1.6rem+9vw,8.75rem)] leading-[0.92] text-ivory">
            <span className="hero-mask">
              <span className="hero-line" style={at(200)}>
                {first}
              </span>
            </span>
            {rest.length ? (
              <>
                {" "}
                <span className="hero-mask">
                  <span className="hero-line text-teal-light italic" style={at(320)}>
                    {rest.join(" ")}
                  </span>
                </span>
              </>
            ) : null}
          </h1>
          <span aria-hidden="true" className="hero-rule mt-6 block h-0.5 w-20 rounded-full bg-teal-light" style={at(700)} />
          <p className="hero-up type-lead mt-6 max-w-xl text-balance text-white/90 sm:text-[1.3125rem]" style={at(800)}>
            {copy.titleLead} {copy.titleFollow}
          </p>
          <div className="hero-up mt-9 flex flex-col items-start gap-x-7 gap-y-4 sm:flex-row sm:items-center" style={at(900)}>
            <Button href={pagePath(locale, "plan")} size="lg" arrow>
              {copy.plan}
            </Button>
            <a
              href="#upcoming-journeys"
              className={cn("group inline-flex min-h-11 items-center gap-2 font-medium text-white underline-offset-4 hover:underline", focusRing)}
            >
              {landing.explore}
              <ArrowRight aria-hidden="true" strokeWidth={2} className="nudge size-4" />
            </a>
          </div>

          {/* Phones: the planning card as a compact strip */}
          <Link
            href={pagePath(locale, "plan")}
            className={cn(
              "hero-up glass-panel mt-8 flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm lg:hidden",
              focusRing,
            )}
            style={at(1000)}
          >
            <span>
              <span className="block text-[0.6875rem] font-semibold tracking-[0.18em] text-teal-light uppercase">{landing.card.eyebrow}</span>
              <span className="mt-0.5 block font-medium text-white">{landing.card.title}</span>
            </span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-teal-light" />
          </Link>
        </div>

        {/* Under the text: the photo controls, the scroll cue and (wide screens) the planning card */}
        <div className="hero-up relative mt-10 flex flex-wrap items-end justify-between gap-6" style={at(1000)}>
          <HeroSlideControls
            labels={{ nowShowing: landing.nowShowing, group: landing.slidesLabel, show: landing.showSlide, pause: landing.pause, play: landing.play }}
          />

          <a
            href="#upcoming-journeys"
            className={cn("absolute bottom-0 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.6875rem] tracking-[0.2em] text-white/70 uppercase hover:text-white xl:flex", focusRing)}
          >
            {landing.scroll}
            <span aria-hidden="true" className="relative block h-10 w-px overflow-hidden bg-white/25">
              <span className="landing-scroll-cue absolute inset-x-0 top-0 block h-1/2 bg-teal-light" />
            </span>
          </a>

          <div className="glass-panel hidden w-80 rounded-3xl p-6 lg:block">
            <p className="text-[0.6875rem] font-semibold tracking-[0.2em] text-teal-light uppercase">{landing.card.eyebrow}</p>
            <p className="mt-2 font-display text-2xl leading-tight font-semibold text-white">{landing.card.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{landing.card.body}</p>
            <Link
              href={pagePath(locale, "plan")}
              className={cn("group mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-light underline-offset-4 hover:underline", focusRing)}
            >
              {landing.card.action}
              <ArrowRight aria-hidden="true" strokeWidth={2} className="nudge size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Verified facts only */}
      <div className="border-t border-white/15 bg-forest-deep/40 backdrop-blur-sm">
        <ul className={cn(shell, "flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-sm text-white/85")}>
          {trust.map(({ key, Icon, text }) => (
            <li key={key} className="inline-flex items-center gap-2">
              <Icon aria-hidden="true" strokeWidth={1.8} className="size-4 text-teal-light" />
              {text}
            </li>
          ))}
        </ul>
      </div>
      </HeroSlideshow>
    </section>
  )
}
