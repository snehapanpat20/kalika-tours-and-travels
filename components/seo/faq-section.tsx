import { ChevronDown } from "lucide-react"
import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/ui/section-heading"
import { focusRing, shell } from "@/components/ui/styles"
import { activeFleet } from "@/data/fleet"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"

export type Faq = { question: string; answer: string }

/**
 * Answers built only from facts the business has confirmed (its vehicles, its
 * services and its trip rules). Shown as visible text; deliberately no FAQPage
 * markup, which Google now reserves for government and health sites.
 *
 * The Our Fleet page's questions: about the fleet (the list of vehicles comes
 * from data/fleet.ts), then trip rules.
 * Availability and prices are always left to the enquiry.
 */
export function fleetFaqs(dictionary: Dictionary, locale: Locale): Faq[] {
  const { questions: q, answers: a } = dictionary.seo.faq
  const rules = dictionary.rules
  const vehicles = new Intl.ListFormat(locale === "mr" ? "mr" : "en", { type: "conjunction" }).format(
    activeFleet.map((vehicle) => dictionary.fleet.vehicles[vehicle.id].name),
  )
  return [
    { question: q.fleetTypes, answer: a.fleetTypes.replace("{vehicles}", vehicles) },
    { question: q.groupSize, answer: a.groupSize },
    { question: q.acNonAc, answer: a.acNonAc },
    { question: q.sleeper, answer: a.sleeper },
    { question: q.specificVehicle, answer: a.specificVehicle },
    { question: q.availability, answer: a.availability },
    { question: q.tripKinds, answer: a.tripKinds },
    { question: q.night, answer: rules.nightTravel },
    { question: q.oneWay, answer: rules.oneWay },
    { question: q.price, answer: `${rules.customPricing} ${rules.extras}` },
  ]
}

export function serviceFaqs(dictionary: Dictionary): Faq[] {
  const { questions: q, answers: a } = dictionary.seo.faq
  const rules = dictionary.rules
  return [
    { question: q.kinds, answer: a.kinds },
    { question: q.book, answer: `${a.book} ${rules.bookingIsRequest}` },
    { question: q.quote, answer: `${rules.quoteIsEnquiry} ${rules.customPricing}` },
    { question: q.cancel, answer: `${rules.noCancellation} ${rules.noRefund}` },
    { question: q.oneWay, answer: rules.oneWay },
  ]
}

export function FaqSection({ id, faqs, copy, className }: { id: string; faqs: Faq[]; copy: Dictionary["seo"]["faq"]; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("py-(--spacing-section)", className)}>
      <div className={cn(shell, "grid gap-10 lg:grid-cols-12 lg:gap-12")}>
        <Reveal className="lg:col-span-4">
          <SectionHeading id={id} eyebrow={copy.eyebrow} title={copy.title} />
        </Reveal>
        <div className="grid content-start gap-3 lg:col-span-8">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-card bg-white shadow-soft ring-1 ring-forest/6 open:ring-teal/30">
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-5 text-left font-bold text-forest [&::-webkit-details-marker]:hidden",
                  focusRing,
                )}
              >
                <span className="text-base sm:text-[1.0625rem]">{faq.question}</span>
                <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-teal-deep transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="-mt-1 px-5 pb-5 leading-relaxed text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
