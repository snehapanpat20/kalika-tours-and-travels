import type { CSSProperties } from "react"
import Image from "next/image"
import { BadgePercent, CalendarClock, Sparkles } from "lucide-react"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { WhatsAppIcon } from "@/components/ui/icons"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import { business } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import type { PublicOffer } from "@/server/cms/offers"

function formatDay(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso))
}

type OfferImage = NonNullable<PublicOffer["image"]>

/**
 * The offer's photo, placed the way the admin chose:
 * - WHOLE: nothing is cut off (posters with text). The frame takes the image's
 *   own shape, kept between portrait 4:5 and wide 2:1; any space left over is
 *   filled with a soft, blurred copy of the same image, never empty bars.
 * - FILL: the image covers the frame, cropped around the chosen focus point.
 */
function OfferPhoto({ image, sizes, single }: { image: OfferImage; sizes: string; single: boolean }) {
  const ratio = Math.min(2, Math.max(0.8, image.width / image.height))
  const whole = image.fit === "WHOLE"
  const frame: CSSProperties | undefined = whole ? { aspectRatio: ratio } : undefined

  return (
    <div
      style={frame}
      className={cn(
        "relative isolate w-full overflow-hidden bg-forest-deep",
        !whole && "aspect-[16/10]",
        // A tall poster never makes the card huge; the blurred copy fills the sides
        whole && "max-h-[36rem]",
        // Beside the text: as tall as the card (the blurred copy fills any extra height)
        single && "md:h-full",
        !whole && single && "md:aspect-auto md:min-h-[26rem]",
      )}
    >
      {whole ? (
        <Image src={image.url} alt="" aria-hidden="true" fill sizes="10vw" className="-z-10 scale-125 object-cover opacity-60 blur-2xl" />
      ) : null}
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        style={whole ? undefined : { objectPosition: image.focus }}
        className={cn(
          "transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          whole ? "object-contain" : "object-cover",
        )}
      />
    </div>
  )
}

/**
 * Current offers from the admin panel. Renders nothing when no offer is
 * active, so an expired offer can never linger on the homepage.
 */
export function OffersSection({ locale, copy, whatsappLabel, offers }: { locale: Locale; copy: Dictionary["cms"]; whatsappLabel: string; offers: PublicOffer[] }) {
  if (!offers.length) return null
  const single = offers.length === 1

  return (
    <section aria-labelledby="offers-title" className="bg-ivory pt-16 sm:pt-20 lg:pt-24">
      <div className={shell}>
        <Reveal>
          <SectionHeading id="offers-title" eyebrow={copy.offers.eyebrow} title={copy.offers.title} description={copy.offers.description} />
        </Reveal>
        <Stagger as="ul" className={cn("mt-10 grid gap-6", !single && "md:grid-cols-2 xl:grid-cols-3")}>
          {offers.map((offer) => {
            const wide = single && Boolean(offer.image)
            // Portrait or square posters take the narrower column, wide photos the larger one
            const tall = Boolean(offer.image && offer.image.fit === "WHOLE" && offer.image.width / offer.image.height < 1.2)
            return (
              <StaggerItem as="li" key={offer.id}>
                <article
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-panel bg-forest-deep text-white shadow-card ring-1 ring-forest/10",
                    wide && "md:grid md:grid-cols-12 md:items-stretch",
                  )}
                >
                  {offer.image ? (
                    <div className={cn(wide && (tall ? "md:col-span-5" : "md:col-span-7"))}>
                      <OfferPhoto
                        image={offer.image}
                        single={single}
                        sizes={single ? (tall ? "(min-width: 768px) 40vw, 100vw" : "(min-width: 768px) 55vw, 100vw") : "(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"}
                      />
                    </div>
                  ) : null}

                  <div className={cn("relative isolate flex flex-1 flex-col p-7 sm:p-9", wide && (tall ? "md:col-span-7" : "md:col-span-5"), wide && "md:justify-center lg:p-14")}>
                    {/* Decoration: a soft teal glow, a faint offer mark and the brand's dashed route line */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                      <div className="absolute -top-24 -right-24 size-72 rounded-full bg-teal/25 blur-3xl" />
                      <div className="absolute -bottom-28 -left-20 size-64 rounded-full bg-coral/10 blur-3xl" />
                      <BadgePercent strokeWidth={1} className="absolute -right-8 -bottom-10 size-48 text-white/[0.04]" />
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-[repeating-linear-gradient(90deg,var(--color-coral)_0_18px,transparent_18px_30px)] opacity-80" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {offer.label ? (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-coral px-3 py-1 text-xs font-extrabold tracking-wide text-forest-deep">
                          <BadgePercent aria-hidden="true" className="size-3.5" />
                          {offer.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.16em] text-teal-light uppercase">
                          <Sparkles aria-hidden="true" className="size-3.5" />
                          {copy.offers.eyebrow}
                        </span>
                      )}
                      {offer.preview ? <span className="rounded-pill bg-white/90 px-2.5 py-1 text-[0.6875rem] font-bold text-forest-deep">{copy.notLiveYet}</span> : null}
                    </div>

                    <h3
                      className={cn(
                        "mt-5 leading-[1.05] font-extrabold tracking-tight text-balance",
                        wide ? "text-[clamp(2rem,1.4rem+1.8vw,3rem)]" : "text-[1.75rem] sm:text-[2rem]",
                      )}
                    >
                      {offer.title}
                    </h3>
                    <span aria-hidden="true" className="mt-5 block h-1 w-14 rounded-full bg-gradient-to-r from-coral to-teal-light" />
                    <p className="mt-5 text-[1.0625rem] leading-relaxed text-white/85 sm:text-lg">{offer.shortDescription}</p>
                    {offer.description ? <p className="mt-3 leading-relaxed whitespace-pre-line text-white/70">{offer.description}</p> : null}

                    <div className="mt-8 flex flex-col gap-5">
                      {offer.endsAt ? (
                        <p className="inline-flex w-fit items-center gap-2 rounded-pill bg-white/[0.07] px-3.5 py-2 text-sm font-semibold text-teal-light ring-1 ring-white/15">
                          <CalendarClock aria-hidden="true" className="size-4" />
                          {copy.offers.validUntil.replace("{date}", formatDay(offer.endsAt, locale))}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {offer.cta ? (
                          <Button href={offer.cta.href} arrow size="lg" className="w-full sm:w-auto">
                            {offer.cta.text}
                          </Button>
                        ) : null}
                        <Button
                          href={business.whatsappUrl}
                          variant="inverse"
                          size="lg"
                          className="w-full sm:w-auto"
                          icon={<WhatsAppIcon className="-ml-1 size-[1.125rem] text-[#25D366]" />}
                        >
                          {whatsappLabel}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
