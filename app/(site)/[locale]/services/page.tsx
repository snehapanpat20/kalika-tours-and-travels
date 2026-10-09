import type { Metadata } from "next"
import { Check } from "lucide-react"
import { cmsIcon } from "@/components/cms/cms-icon"
import { CtaSection } from "@/components/home/cta-section"
import { journeyVisuals, serviceIcons, serviceOrder, type Icon } from "@/components/home/home-content"
import { PageHero } from "@/components/layout/page-hero"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { ImageReveal, Reveal } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { Button } from "@/components/ui/button"
import { shell } from "@/components/ui/styles"
import { FaqSection, serviceFaqs } from "@/components/seo/faq-section"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { pagePath, planPath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { serviceSchema } from "@/lib/seo/structured-data"
import { cn } from "@/lib/utils/cn"
import { listLiveServices } from "@/server/cms/services"
import type { ServiceId } from "@/types/catalog"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "services") : {}
}

type ServiceView = {
  anchor: string
  title: string
  body: string
  details: string | null
  suitable: string[]
  icon: Icon
  image: PhotoSource
  alt: string
  planService: ServiceId
}

export default async function ServicesPage(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "services")
  const copy = dictionary.pages.services
  const items = dictionary.home.services.items
  const managed = await listLiveServices(locale, preview)

  // Services managed in the admin panel, or the built-in five
  const services: ServiceView[] = managed
    ? managed.map((service) => ({
        anchor: service.anchor,
        title: service.title,
        body: service.shortDescription,
        details: service.description,
        suitable: service.suitableFor,
        icon: cmsIcon(service.icon),
        image: service.image ? { src: service.image.url } : journeyVisuals[service.planService],
        alt: service.image?.alt ?? "",
        planService: service.planService,
      }))
    : serviceOrder.map((id) => ({
        anchor: id,
        title: items[id].title,
        body: items[id].body,
        details: null,
        suitable: copy.suitable[id],
        icon: serviceIcons[id],
        image: journeyVisuals[id],
        alt: dictionary.home.journeys.items[id].alt,
        planService: id,
      }))

  return (
    <>
      <PageStructuredData
        locale={locale}
        page="services"
        crumbs={crumbs}
        extra={services.map((service) =>
          serviceSchema({ name: service.title, description: service.body, serviceType: service.title, url: `${pagePath(locale, "services")}#${service.anchor}` }),
        )}
      />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="services-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.servicesHero}
        vivid
        imageAlt={copy.imageAlt}
      />

      <div className="bg-ivory py-(--spacing-section)">
        <div className={cn(shell, "grid gap-20 lg:gap-28")}>
          {services.map((service, index) => {
            const ServiceIcon = service.icon
            const flipped = index % 2 === 1
            return (
              <section key={service.anchor} id={service.anchor} aria-labelledby={`${service.anchor}-title`} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
                <ImageReveal
                  className={cn(
                    "relative aspect-[4/3] overflow-hidden rounded-panel bg-stone-deep lg:col-span-6",
                    flipped && "lg:order-2",
                  )}
                >
                  <Photo image={service.image} alt={service.alt} sizes="(min-width: 1024px) 45vw, 100vw" />
                </ImageReveal>
                <Reveal className="lg:col-span-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-teal/10 text-teal-deep">
                      <ServiceIcon aria-hidden="true" strokeWidth={1.7} className="size-5" />
                    </span>
                    <span className="text-sm font-bold text-coral">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h2 id={`${service.anchor}-title`} className="type-h2 mt-5 text-forest">
                    {service.title}
                  </h2>
                  <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink/80">{service.body}</p>
                  {service.details ? <p className="mt-4 max-w-xl leading-relaxed whitespace-pre-line text-ink/75">{service.details}</p> : null}

                  {service.suitable.length ? (
                    <>
                      <h3 className="mt-8 text-xs font-extrabold tracking-[0.16em] text-muted uppercase">{copy.suitableFor}</h3>
                      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        {service.suitable.map((entry) => (
                          <li key={entry} className="flex items-start gap-2.5 text-ink/85">
                            <Check aria-hidden="true" strokeWidth={2.2} className="mt-1 size-4 shrink-0 text-teal" />
                            {entry}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  <Button href={planPath(locale, { service: service.planService })} arrow className="mt-9">
                    {dictionary.pages.common.planThisTrip}
                  </Button>
                </Reveal>
              </section>
            )
          })}
        </div>
      </div>

      <FaqSection id="services-faq-title" faqs={serviceFaqs(dictionary)} copy={dictionary.seo.faq} className="bg-stone" />

      <CtaSection locale={locale} copy={dictionary.home.cta} />
    </>
  )
}
