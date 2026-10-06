import { MapPin } from "lucide-react"
import { whyIcons } from "@/components/home/home-content"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import { formatLocation } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import type { WhyPointId } from "@/types/home"

const order: WhyPointId[] = ["comfort", "together", "service", "flexible"]

export function WhyKalika({ locale, copy }: { locale: Locale; copy: Dictionary["home"]["why"] }) {
  return (
    <section aria-labelledby="why-title" className="bg-ivory py-(--spacing-section)">
      <div className={cn(shell, "grid gap-14 lg:grid-cols-12 lg:gap-8")}>
        <Reveal className="lg:col-span-5 lg:pr-10">
          <SectionHeading id="why-title" eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
          <p className="mt-8 inline-flex items-center gap-2.5 rounded-pill bg-stone px-4 py-2 text-sm font-semibold text-forest">
            <MapPin aria-hidden="true" strokeWidth={1.8} className="size-4 text-coral" />
            {formatLocation(locale)}
          </p>
        </Reveal>

        <Stagger as="ol" className="grid gap-x-10 sm:grid-cols-2 lg:col-span-7">
          {order.map((id, index) => {
            const Icon = whyIcons[id]
            const point = copy.points[id]
            return (
              <StaggerItem as="li" key={id} className="relative py-8 sm:py-10">
                <div aria-hidden="true" className="road-line absolute inset-x-0 top-0 text-forest" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-coral">{String(index + 1).padStart(2, "0")}</span>
                  <Icon aria-hidden="true" strokeWidth={1.6} className="size-5 text-teal-deep" />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-forest sm:text-[1.75rem]">{point.title}</h3>
                <p className="mt-3 max-w-xs leading-relaxed text-muted">{point.body}</p>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
