import Image from "next/image"
import { BadgePercent, CalendarClock } from "lucide-react"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import type { PublicOffer } from "@/server/cms/offers"

function formatDay(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso))
}

/**
 * Current offers from the admin panel. Renders nothing when no offer is
 * active, so an expired offer can never linger on the homepage.
 */
export function OffersSection({ locale, copy, offers }: { locale: Locale; copy: Dictionary["cms"]; offers: PublicOffer[] }) {
  if (!offers.length) return null
  const single = offers.length === 1

  return (
    <section aria-labelledby="offers-title" className="bg-ivory pt-16 sm:pt-20 lg:pt-24">
      <div className={shell}>
        <Reveal>
          <SectionHeading id="offers-title" eyebrow={copy.offers.eyebrow} title={copy.offers.title} description={copy.offers.description} />
        </Reveal>
        <Stagger as="ul" className={cn("mt-10 grid gap-5", !single && "md:grid-cols-2 xl:grid-cols-3")}>
          {offers.map((offer) => (
            <StaggerItem as="li" key={offer.id}>
              <article
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-panel bg-forest text-white shadow-card",
                  single && offer.image && "md:grid md:grid-cols-2",
                )}
              >
                {offer.image ? (
                  <div className={cn("relative aspect-[16/9] bg-forest-soft", single && "md:aspect-auto md:min-h-80")}>
                    <Image
                      src={offer.image.url}
                      alt={offer.image.alt}
                      fill
                      sizes={single ? "(min-width: 768px) 45vw, 100vw" : "(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"}
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    {offer.label ? (
                      <span className="inline-flex items-center gap-1.5 rounded-pill bg-coral px-3 py-1 text-xs font-extrabold tracking-wide text-forest-deep">
                        <BadgePercent aria-hidden="true" className="size-3.5" />
                        {offer.label}
                      </span>
                    ) : null}
                    {offer.preview ? <span className="rounded-pill bg-white/90 px-2.5 py-1 text-[0.6875rem] font-bold text-forest-deep">{copy.notLiveYet}</span> : null}
                  </div>
                  <h3 className="mt-4 text-2xl leading-tight font-extrabold tracking-tight text-balance">{offer.title}</h3>
                  <p className="mt-3 leading-relaxed text-white/80">{offer.shortDescription}</p>
                  {offer.description ? <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-white/70">{offer.description}</p> : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
                    {offer.endsAt ? (
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-light">
                        <CalendarClock aria-hidden="true" className="size-4" />
                        {copy.offers.validUntil.replace("{date}", formatDay(offer.endsAt, locale))}
                      </p>
                    ) : (
                      <span />
                    )}
                    {offer.cta ? (
                      <Button href={offer.cta.href} arrow>
                        {offer.cta.text}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
