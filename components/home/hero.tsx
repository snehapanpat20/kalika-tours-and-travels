import Link from "next/link"
import type { CSSProperties } from "react"
import { Plane, Search } from "lucide-react"
import { heroImage, serviceIcons, serviceOrder } from "@/components/home/home-content"
import { HeroParallax } from "@/components/home/hero-parallax"
import { HeroZoomBackground, HeroZoomContent, HeroZoomTrack } from "@/components/home/hero-zoom"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { focusRing, shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath, planPath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

/** Stagger index for the CSS load sequence in globals.css (`.hero-in`). */
const step = (i: number) => ({ "--i": i }) as CSSProperties

export type HeroOverrides = {
  /** Admin-chosen background photo; the India collage is used without one. */
  image?: PhotoSource | null
}

/**
 * Postcard-style hero in the brand palette: real places across India under a
 * forest-to-teal sky, the headline centred in the sky, a "where to?" search that
 * opens the trip planner with the destination filled in, and journey shortcuts.
 */
export function Hero({
  locale,
  copy,
  services,
  overrides = {},
}: {
  locale: Locale
  copy: Dictionary["home"]["hero"]
  /** Service names for the journey chips. */
  services: Dictionary["services"]
  overrides?: HeroOverrides
}) {
  return (
    <HeroZoomTrack>
      <section aria-labelledby="hero-title" className="relative isolate flex min-h-[max(40rem,100svh)] overflow-hidden bg-forest-deep text-white lg:min-h-[max(46rem,100svh)]">
        {/* Background: fade in, scroll parallax, zoom through on scroll, slow Ken Burns */}
        <div className="hero-bg absolute inset-0 -z-20">
          <HeroZoomBackground>
            <HeroParallax>
              <div className="hero-kenburns absolute inset-0 origin-[50%_70%]">
                <Photo
                  image={overrides.image ?? heroImage}
                  alt={copy.imageAlt}
                  sizes="100vw"
                  preload
                  // Keep the landmarks and the mist in view; the sky above holds the words
                  className="object-[50%_100%]"
                />
              </div>
            </HeroParallax>
          </HeroZoomBackground>
        </div>

        {/* Deeper shade behind the words, and the mist that settles into the page */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(ellipse_60%_55%_at_50%_38%,rgb(7_42_36/0.45),transparent_75%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ivory via-ivory/70 to-transparent" />
        </div>

        <HeroZoomContent className={cn(shell, "flex flex-col items-center pt-32 pb-24 text-center sm:pt-36 lg:pt-40")}>
          <p
            className="hero-in inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-teal-light uppercase ring-1 ring-white/25 backdrop-blur-sm"
            style={step(0)}
          >
            {copy.eyebrow}
          </p>

          <h1 id="hero-title" className="hero-in relative mt-6 text-balance" style={step(1)}>
            <span className="block text-[clamp(2.75rem,8vw,6.25rem)] leading-[0.95] font-extrabold tracking-tight text-white drop-shadow-[0_4px_24px_rgb(7_42_36/0.45)]">
              {copy.titleLead}
            </span>
            <span className="mt-1 block bg-gradient-to-r from-teal-light via-[#b8e6dc] to-coral bg-clip-text pb-2 text-[clamp(2.75rem,8vw,6.25rem)] leading-[1] font-extrabold tracking-tight text-transparent">
              {copy.titleFollow}
            </span>
            {/* A little plane flying past the headline, with its dotted trail */}
            <span aria-hidden="true" className="pointer-events-none absolute -top-6 -right-10 hidden text-teal-light sm:block lg:-right-20">
              <svg viewBox="0 0 120 40" className="h-8 w-24 overflow-visible lg:h-10 lg:w-28" fill="none">
                <path d="M2 34 C 30 30, 60 6, 104 12" stroke="currentColor" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" opacity="0.55" />
              </svg>
              <Plane className="absolute -top-3 -right-4 size-7 rotate-12 fill-teal-light/20 lg:size-8" strokeWidth={1.8} />
            </span>
          </h1>

          <p
            className="hero-in mt-3 max-w-2xl font-[family-name:var(--font-script)] text-[clamp(1.35rem,3.2vw,2.1rem)] leading-snug font-bold text-[#f9b89a] drop-shadow-[0_2px_12px_rgb(7_42_36/0.5)]"
            style={step(2)}
          >
            {copy.description}
          </p>

          {/* Works without JavaScript: opens the trip planner with ?destination=… */}
          <form action={pagePath(locale, "plan")} method="get" role="search" className="hero-in mt-9 w-full max-w-2xl" style={step(3)}>
            <div className="flex items-center gap-2 rounded-pill bg-white p-2 pl-5 shadow-overlay ring-1 ring-forest/5 focus-within:ring-2 focus-within:ring-teal">
              <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
              <label htmlFor="hero-destination" className="sr-only">
                {copy.searchLabel}
              </label>
              <input
                id="hero-destination"
                name="destination"
                type="search"
                maxLength={120}
                autoComplete="off"
                placeholder={copy.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-ink placeholder:text-muted/80 focus:outline-none"
              />
              <button
                type="submit"
                className={cn(
                  "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-pill bg-coral px-4 text-sm font-bold text-forest-deep transition-colors hover:bg-coral/90 sm:px-6",
                  focusRing,
                )}
              >
                <Search aria-hidden="true" className="size-4 sm:hidden" />
                <span className="sr-only sm:not-sr-only">{copy.plan}</span>
              </button>
            </div>
          </form>

          <nav aria-label={copy.journeysLabel} className="hero-in mt-6 w-full max-w-3xl" style={step(4)}>
            <ul className="flex flex-wrap justify-center gap-2">
              {serviceOrder.map((id) => {
                const Icon = serviceIcons[id]
                return (
                  <li key={id}>
                    <Link
                      href={planPath(locale, { service: id })}
                      scroll={false}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-pill bg-forest-deep/45 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-forest-deep/65",
                        focusRing,
                      )}
                    >
                      <Icon aria-hidden="true" strokeWidth={1.9} className="size-4 text-teal-light" />
                      {services[id].name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </HeroZoomContent>
      </section>
    </HeroZoomTrack>
  )
}
