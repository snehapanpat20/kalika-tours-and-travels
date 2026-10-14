import Image from "next/image"
import { Star } from "lucide-react"
import { resolvePhoto } from "@/components/media/photo"
import { Reveal } from "@/components/motion/reveal"
import { QuoteForm } from "@/components/sections/quote-form"
import { Button } from "@/components/ui/button"
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons"
import { shell } from "@/components/ui/styles"
import { business } from "@/data/business"
import { pageCtas, type PageCtaKey, type PageCtaTarget, type PageCtaVariant, type PageCtaVisual } from "@/data/pageCtas"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

const surface: Record<PageCtaVariant, string> = {
  gradient: "cta-gradient text-ivory",
  dark: "bg-forest-deep text-white",
  cream: "cta-cream text-forest",
}

/** The highlighted phrase: light gold on the gradient, gold on dark brown, red-orange on cream (gold is too faint there). */
const accentColour: Record<PageCtaVariant, string> = {
  gradient: "text-[#f6d27a]",
  dark: "text-highlight",
  cream: "text-coral",
}

const subtextColour: Record<PageCtaVariant, string> = {
  gradient: "text-ivory/90",
  dark: "text-white/75",
  cream: "text-ink/80",
}

function hrefOf(locale: Locale, target: PageCtaTarget): string {
  if ("page" in target) return pagePath(locale, target.page)
  return target.external === "whatsapp" ? business.whatsappUrl : business.instagramUrl
}

/**
 * The closing call to action above the footer: a serif headline with one
 * phrase in the handwritten face, one sentence, at most two buttons, and an
 * optional decoration. Layout and links come from data/pageCtas.ts, wording
 * from the dictionaries (`pageCtas.items.<page>`), so a page only says which
 * band it wants:
 *
 *   <PageCTA pageKey="about" locale={locale} dictionary={dictionary} />
 *
 * `variant` overrides the page's usual colouring. The band fades up as it
 * scrolls into view (not for visitors who prefer reduced motion). The site's
 * floating WhatsApp button is not repeated here.
 */
export function PageCTA({ pageKey, locale, dictionary, variant }: { pageKey: PageCtaKey; locale: Locale; dictionary: Dictionary; variant?: PageCtaVariant }) {
  const config = pageCtas[pageKey]
  const copy = dictionary.pageCtas.items[pageKey]
  const tone = variant ?? config.variant
  const onDark = tone !== "cream"
  const id = `page-cta-${pageKey}`
  const visual = config.visual
  const quote = visual?.kind === "quote"

  return (
    <section aria-labelledby={id} className={cn("brand-palette relative isolate overflow-hidden", surface[tone])}>
      {tone === "gradient" ? <div aria-hidden="true" className="landing-jali absolute inset-0 -z-10" /> : null}
      {tone !== "gradient" ? <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-highlight/60 to-transparent" /> : null}

      <Reveal y={24} className={cn(shell, "grid items-center gap-8 py-12 sm:py-14 lg:grid-cols-12 lg:gap-12")}>
        <div className={cn(quote ? "lg:col-span-6" : "lg:col-span-7")}>
          <h2 id={id} className={cn("text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.08] text-balance", onDark ? "text-ivory" : "text-forest")}>
            {copy.lead ? `${copy.lead} ` : null}
            <span className={cn("cta-accent", accentColour[tone])}>{copy.accent}</span>
            {copy.tail}
          </h2>
          <p className={cn("mt-4 max-w-xl text-[1.0625rem] leading-relaxed", subtextColour[tone])}>{copy.subtext}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* On the Services band the form's own button is the main action */}
            {quote ? null : (
              <CtaButton locale={locale} target={config.primary} tone={tone} kind="primary">
                {copy.primary}
              </CtaButton>
            )}
            {config.secondary && copy.secondary ? (
              <CtaButton locale={locale} target={config.secondary} tone={tone} kind="secondary">
                {copy.secondary}
              </CtaButton>
            ) : null}
          </div>
        </div>

        {visual ? (
          <div className={cn(quote ? "lg:col-span-6" : "lg:col-span-5")}>
            {visual.kind === "quote" ? <QuoteForm locale={locale} copy={dictionary.pageCtas.quote} submit={copy.primary} /> : <Visual visual={visual} tone={tone} />}
          </div>
        ) : null}
      </Reveal>
    </section>
  )
}

function CtaButton({ locale, target, tone, kind, children }: { locale: Locale; target: PageCtaTarget; tone: PageCtaVariant; kind: "primary" | "secondary"; children: string }) {
  const external = "external" in target ? target.external : null
  const icon =
    external === "whatsapp" ? <WhatsAppIcon className="-ml-1 size-5" /> : external === "instagram" ? <InstagramIcon className="-ml-1 size-[1.125rem]" /> : undefined
  const variant = kind === "primary" ? (tone === "gradient" ? "light" : "primary") : tone === "cream" ? "outline" : "inverse"
  return (
    <Button href={hrefOf(locale, target)} size="lg" variant={variant} arrow={!external} icon={icon} className="w-full sm:w-auto">
      {children}
    </Button>
  )
}

/** Decoration only: hidden from assistive technology, and never over the text. */
function Visual({ visual, tone }: { visual: Exclude<PageCtaVisual, { kind: "quote" }>; tone: PageCtaVariant }) {
  switch (visual.kind) {
    case "mandala":
      return <Mandala className="mx-auto hidden size-52 text-[#f6d27a]/55 lg:block" />
    case "arches":
      return (
        <div aria-hidden="true" className="mx-auto hidden h-52 w-56 items-end justify-center gap-3 lg:flex">
          {[0.62, 1, 0.78].map((height, index) => (
            <span
              key={index}
              className={cn("w-16 rounded-t-full border-2", index === 1 ? "border-coral bg-coral/10" : "border-highlight/70")}
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>
      )
    case "route":
      return <RouteMap className="mx-auto hidden h-52 w-full max-w-sm text-ivory lg:block" />
    case "circles":
      return (
        <ul aria-hidden="true" className="flex justify-center -space-x-4 lg:justify-end">
          {visual.photos.map((image, index) => {
            const src = resolvePhoto(image).src
            return src ? (
              <li key={image.name} className="relative size-16 overflow-hidden rounded-full border-4 border-[#f4e6cc] bg-stone-deep shadow-card sm:size-20" style={{ zIndex: visual.photos.length - index }}>
                <Image src={src} alt="" fill sizes="80px" className="object-cover" style={image.position ? { objectPosition: image.position } : undefined} />
              </li>
            ) : null
          })}
        </ul>
      )
    case "prints":
      return (
        <div aria-hidden="true" className="relative mx-auto hidden h-56 w-full max-w-md lg:block">
          {visual.photos.map((image, index) => {
            const src = resolvePhoto(image).src
            const place = ["left-0 top-6 -rotate-6", "left-1/2 top-0 z-10 -translate-x-1/2 rotate-2", "right-0 top-8 rotate-6"][index]
            return src ? (
              <span key={image.name} className={cn("absolute block w-40 bg-[#fbfaf7] p-2 pb-6 shadow-card", place)}>
                <span className="relative block aspect-square overflow-hidden bg-stone-deep">
                  <Image src={src} alt="" fill sizes="160px" className="object-cover" style={image.position ? { objectPosition: image.position } : undefined} />
                </span>
              </span>
            ) : null
          })}
        </div>
      )
    case "stars":
      return (
        <div aria-hidden="true" className="flex justify-center gap-2 lg:justify-end">
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} className={cn("size-9 fill-current sm:size-11", tone === "cream" ? "text-highlight" : "text-[#f6d27a]")} />
          ))}
        </div>
      )
  }
}

/** A light mandala of petals and rings, drawn in currentColor. */
function Mandala({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.2" className={className}>
      <circle cx="100" cy="100" r="94" />
      <circle cx="100" cy="100" r="70" strokeDasharray="2 5" />
      <circle cx="100" cy="100" r="22" />
      {Array.from({ length: 12 }, (_, index) => (
        <g key={index} transform={`rotate(${index * 30} 100 100)`}>
          <path d="M100 30 C112 48 112 64 100 78 C88 64 88 48 100 30Z" />
          <circle cx="100" cy="16" r="3" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  )
}

/** A dotted route between a few pins, standing in for a map. */
function RouteMap({ className }: { className?: string }) {
  const pins = [
    [40, 150],
    [120, 70],
    [210, 120],
    [300, 50],
  ]
  return (
    <svg aria-hidden="true" viewBox="0 0 340 200" fill="none" className={className}>
      <path d="M40 150 C70 90 95 70 120 70 S180 140 210 120 S270 40 300 50" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      {pins.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <circle r="11" fill="currentColor" fillOpacity="0.18" />
          <circle r="5" fill="#f6d27a" />
        </g>
      ))}
    </svg>
  )
}
