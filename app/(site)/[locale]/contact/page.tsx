import type { Metadata } from "next"
import { ContactActions, ContactDetails, TripTerms } from "@/components/contact/contact-blocks"
import { PageHero } from "@/components/layout/page-hero"
import { Reveal } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { Button } from "@/components/ui/button"
import { shell } from "@/components/ui/styles"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { planPath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/utils/cn"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "contact") : {}
}

export default async function ContactPage(props: LocaleParams) {
  const { locale, dictionary } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "contact")
  const copy = dictionary.pages.contact
  const contact = dictionary.home.contact

  return (
    <>
      <PageStructuredData locale={locale} page="contact" crumbs={crumbs} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="contact-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.contactHero}
        imageAlt={copy.imageAlt}
      />

      <section aria-label={contact.title} className="bg-ivory py-(--spacing-section)">
        <div className={cn(shell, "grid gap-10 lg:grid-cols-12 lg:gap-14")}>
          <Reveal className="lg:col-span-7">
            <div className="rounded-panel bg-white p-6 shadow-card ring-1 ring-forest/5 sm:p-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-forest">{contact.title}</h2>
              <p className="mt-2 max-w-lg text-muted">{contact.description}</p>
              <ContactActions copy={contact} className="mt-6" />
              <div className="mt-8 border-t border-dashed border-line pt-8">
                <ContactDetails locale={locale} copy={contact} />
              </div>
            </div>
          </Reveal>

          <div className="grid content-start gap-6 lg:col-span-5">
            <Reveal delay={0.08}>
              <div className="rounded-panel bg-forest p-6 text-white sm:p-8">
                <h2 className="text-2xl font-extrabold tracking-tight">{copy.planTitle}</h2>
                <p className="mt-3 leading-relaxed text-white/75">{copy.planBody}</p>
                <Button href={planPath(locale)} arrow className="mt-6">
                  {dictionary.pages.common.planTrip}
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.14}>
              <TripTerms copy={contact} rules={dictionary.rules} />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
