import { ctaImage } from "@/components/home/home-content"
import { Photo } from "@/components/media/photo"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { WhatsAppIcon } from "@/components/ui/icons"
import { shell } from "@/components/ui/styles"
import { business } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"

export function CtaSection({ locale, copy }: { locale: Locale; copy: Dictionary["home"]["cta"] }) {
  return (
    <section aria-labelledby="cta-title" className="bg-ivory py-(--spacing-section)">
      <div className={shell}>
        <Reveal className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest-deep px-6 py-16 text-white sm:px-12 sm:py-20 lg:px-20 lg:py-28">
          <div className="absolute inset-0 -z-20">
            <Photo image={ctaImage} alt="" sizes="(min-width: 1440px) 86rem, 100vw" />
          </div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-deep/90 via-forest-deep/65 to-forest-deep/20" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1 bg-[repeating-linear-gradient(90deg,var(--kalika-coral)_0_18px,transparent_18px_30px)]" />

          <div className="max-w-2xl">
            <p className="eyebrow text-white/80">{copy.eyebrow}</p>
            <h2 id="cta-title" className="type-h2 mt-5 text-white">
              {copy.title}
            </h2>
            <p className="type-lead mt-5 max-w-lg text-white/85">{copy.description}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href={pagePath(locale, "plan")} size="lg" arrow>
                {copy.plan}
              </Button>
              <Button href={business.whatsappUrl} variant="light" size="lg" icon={<WhatsAppIcon className="-ml-1 size-5 text-whatsapp" />}>
                {copy.whatsapp}
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
