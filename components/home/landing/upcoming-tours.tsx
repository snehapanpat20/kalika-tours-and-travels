import Link from "next/link"
import { ArrowUpRight, Clock } from "lucide-react"
import { ArrowLink, LandingHeading } from "@/components/home/landing/landing-heading"
import { SnapCarousel } from "@/components/home/landing/snap-carousel"
import { Photo } from "@/components/media/photo"
import { Reveal } from "@/components/motion/reveal"
import { upcomingTours } from "@/components/pages/upcoming-tours"
import { focusRing, shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath, planPath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

/**
 * "Upcoming Journeys": the tour packages (the same list as on the Destinations
 * page, from components/pages/upcoming-tours.ts) as a row of arch-framed
 * cards. No dates, prices or seat counts are published for them, so none are
 * shown: each card gives the typical duration and opens an enquiry for that tour.
 */
export function UpcomingTours({ locale, copy, tours }: { locale: Locale; copy: Dictionary["home"]["landing"]["tours"]; tours: Dictionary["pages"]["destinations"]["tours"]["items"] }) {
  return (
    <section id="upcoming-journeys" aria-labelledby="tours-title" className="scroll-mt-20 bg-ivory py-(--spacing-section)">
      <div className={shell}>
        <Reveal y={24}>
          <LandingHeading
            id="tours-title"
            eyebrow={copy.eyebrow}
            lead={copy.lead}
            accent={copy.accent}
            description={copy.description}
            action={<ArrowLink href={pagePath(locale, "destinations")}>{copy.viewAll}</ArrowLink>}
          />
        </Reveal>

        <Reveal y={24} delay={0.1}>
          <SnapCarousel
            label={copy.lead + " " + copy.accent}
            previous={copy.previous}
            next={copy.next}
            className="mt-10"
            listClassName="[&>li]:shrink-0 [&>li]:basis-[78%] sm:[&>li]:basis-[calc((100%-1.25rem)/2)] lg:[&>li]:basis-[calc((100%-2.5rem)/3)]"
          >
            {upcomingTours.map(({ id, image }) => {
              const tour = tours[id]
              return (
                <li key={id} className="snap-start">
                  <article className="lift-card group relative flex h-full flex-col rounded-[1.75rem] border border-highlight/35 bg-white p-3 shadow-soft">
                    <div className="arch-frame relative aspect-[4/5] overflow-hidden bg-stone-deep">
                      {image ? (
                        <span className="zoom-img absolute inset-0 block">
                          <Photo image={image} alt="" sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 78vw" />
                        </span>
                      ) : null}
                      <span className="glass-chip absolute top-[22%] left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white">
                        <Clock aria-hidden="true" className="size-3.5" />
                        <span className="sr-only">{copy.duration}: </span>
                        {tour.duration}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col px-3 pt-5 pb-3">
                      <h3 className="font-display text-[1.5rem] leading-tight font-semibold text-forest">{tour.name}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{tour.description}</p>
                      <Link
                        href={planPath(locale, { destination: tour.name })}
                        className={cn("mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-sm font-semibold text-teal-deep underline-offset-4 hover:underline", focusRing)}
                      >
                        {copy.enquire}
                        <span className="sr-only">: {tour.name}</span>
                        <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </article>
                </li>
              )
            })}
          </SnapCarousel>
        </Reveal>
      </div>
    </section>
  )
}
