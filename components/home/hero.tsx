import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight } from "lucide-react"
import type { ImageRef } from "@/components/home/home-content"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { Button } from "@/components/ui/button"
import { focusRing, shell } from "@/components/ui/styles"
import { business, formatLocation } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

/** When an element joins the CSS load sequence in globals.css, in ms after the page appears. */
const at = (ms: number) => ({ "--d": ms }) as CSSProperties

/** Our own Traveller on a monsoon ghat road: shown unless the admin has chosen another photo. */
const homePhoto: ImageRef = { category: "traveller", name: "monsoon-front", position: "50% 55%" }

export type HeroOverrides = {
  /** Admin-chosen background photo; the Traveller photograph is used without one. */
  image?: PhotoSource | null
}

/**
 * The homepage opening, centred over one photograph: where we are, the brand
 * name set large (its second word in gold italics), the headline beneath it,
 * and two ways forward: the trip planner and the Services page.
 *
 * It arrives in sequence (pure CSS, so it runs once and doesn't wait for
 * scripts): the photo starts a slow push-in, the name rises word by word from
 * behind a mask, a small rule draws under it, then the headline and the
 * buttons fade up. Visitors who prefer reduced motion get it all in place.
 */
export function Hero({
  locale,
  copy,
  servicesLabel,
  overrides = {},
}: {
  locale: Locale
  copy: Dictionary["home"]["hero"]
  /** Label of the secondary link, which opens the Services page. */
  servicesLabel: string
  overrides?: HeroOverrides
}) {
  // "Kalika" stays upright; the rest of the name ("Yatra") is the gold italic word
  const [first, ...rest] = business.localName[locale].split(" ")

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-forest-deep text-white">
      <div className="hero-bg absolute inset-0 -z-20">
        <div className="hero-zoom absolute inset-0">
          <Photo image={overrides.image ?? homePhoto} alt={copy.imageAlt} sizes="100vw" preload />
        </div>
      </div>
      <div aria-hidden="true" className="hero-veil absolute inset-0 -z-10" />

      <div className={cn(shell, "flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center py-20 text-center lg:min-h-[calc(100svh-5rem)]")}>
        <p className="hero-up eyebrow text-teal-light" style={at(100)}>
          {formatLocation(locale)}
        </p>
        <h1 id="hero-title" className="mt-5 text-[clamp(3.5rem,1.4rem+9.5vw,8.5rem)] leading-[0.95] text-white">
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
        <span aria-hidden="true" className="hero-rule mt-5 block h-0.5 w-16 rounded-full bg-teal-light" style={at(700)} />
        <p className="hero-up type-lead mt-5 max-w-2xl text-balance text-white/90 sm:text-[1.375rem]" style={at(800)}>
          {copy.titleLead} {copy.titleFollow}
        </p>
        <div className="hero-up mt-9 flex flex-col items-center gap-x-7 gap-y-4 sm:flex-row" style={at(900)}>
          <Button href={pagePath(locale, "plan")} size="lg">
            {copy.plan}
          </Button>
          <Link
            href={pagePath(locale, "services")}
            className={cn("group inline-flex min-h-11 items-center gap-2 font-medium text-white underline-offset-4 hover:underline", focusRing)}
          >
            {servicesLabel}
            <ArrowRight aria-hidden="true" strokeWidth={2} className="nudge size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
