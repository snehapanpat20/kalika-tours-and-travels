import type { Metadata } from "next"
import { ContactActions, PlanFormCard, TripTerms } from "@/components/contact/contact-blocks"
import { PageHero } from "@/components/layout/page-hero"
import { Reveal } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { shell } from "@/components/ui/styles"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { serviceOptions } from "@/data/services"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { createPageMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/utils/cn"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "plan") : {}
}

export default async function PlanYourTripPage(props: LocaleParams) {
  const { locale, dictionary } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "plan")
  const copy = dictionary.pages.plan
  const contact = dictionary.home.contact

  return (
    <>
      <PageStructuredData locale={locale} page="plan" crumbs={crumbs} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="plan-page-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.planHero}
        imageAlt={copy.imageAlt}
      />

      <section aria-labelledby="plan-title" className="bg-stone py-(--spacing-section)">
        <div className={cn(shell, "grid items-start gap-10 lg:grid-cols-12 lg:gap-12")}>
          <div className="lg:col-span-7 xl:col-span-8">
            <PlanFormCard locale={locale} dictionary={dictionary} services={serviceOptions(locale)} />
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-28 lg:col-span-5 xl:col-span-4">
            <Reveal>
              <div className="rounded-panel bg-white p-6 ring-1 ring-forest/5 sm:p-7">
                <h2 className="text-lg font-extrabold tracking-tight text-forest">{copy.nextTitle}</h2>
                <ol className="mt-5 grid gap-4">
                  {copy.next.map((step, index) => (
                    <li key={step} className="flex gap-3.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-soft text-sm font-extrabold text-teal-deep">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed text-ink/85">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="rounded-panel bg-white p-6 ring-1 ring-forest/5 sm:p-7">
                <h2 className="text-lg font-extrabold tracking-tight text-forest">{copy.altTitle}</h2>
                <p className="mt-1 text-muted">{copy.altBody}</p>
                <ContactActions copy={contact} className="mt-5" />
              </div>
            </Reveal>
            <Reveal delay={0.14}>
              <TripTerms copy={contact} rules={dictionary.rules} className="bg-white" />
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  )
}
