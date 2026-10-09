import type { Metadata } from "next"
import { Armchair, HeartHandshake, MapPin, Route, Users } from "lucide-react"
import { CtaSection } from "@/components/home/cta-section"
import { JourneyStory } from "@/components/home/journey-story"
import { PageHero } from "@/components/layout/page-hero"
import { Photo } from "@/components/media/photo"
import { ImageReveal, Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { formatLocation } from "@/data/business"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { pagePath } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/utils/cn"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "about") : {}
}

const valueIcons = { people: Users, comfort: Armchair, planning: Route, care: HeartHandshake } as const

export default async function AboutPage(props: LocaleParams) {
  const { locale, dictionary } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "about")
  const copy = dictionary.pages.about

  return (
    <>
      <PageStructuredData locale={locale} page="about" crumbs={crumbs} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="about-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.titleLead}
        titleFollow={copy.titleFollow}
        description={copy.description}
        image={pageImages.aboutHero}
        vivid
        imageAlt={copy.imageAlt}
        actions={
          <Button href={pagePath(locale, "plan")} size="lg" arrow className="w-full sm:w-auto">
            {dictionary.pages.common.planJourney}
          </Button>
        }
      />

      <section aria-labelledby="story-heading" className="bg-ivory py-(--spacing-section)">
        <div className={cn(shell, "grid items-center gap-12 lg:grid-cols-12 lg:gap-10")}>
          <Reveal className="lg:col-span-6 xl:col-span-7">
            <p className="eyebrow text-teal-deep">{copy.storyEyebrow}</p>
            <h2 id="story-heading" className="type-h2 mt-4 text-forest">
              {copy.storyTitle}
            </h2>
            <div className="mt-6 grid max-w-2xl gap-5 text-[1.0625rem] leading-relaxed text-ink/85">
              {copy.story.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
            <p className="mt-8 inline-flex items-center gap-2.5 rounded-pill bg-stone px-4 py-2 text-sm font-semibold text-forest">
              <MapPin aria-hidden="true" strokeWidth={1.8} className="size-4 text-coral" />
              {formatLocation(locale)}
            </p>
          </Reveal>
          <div className="lg:col-span-6 xl:col-span-5">
            <ImageReveal className="relative aspect-[4/5] overflow-hidden rounded-panel bg-stone-deep">
              <Photo image={pageImages.aboutStory} alt={copy.storyImageAlt} sizes="(min-width: 1024px) 40vw, 100vw" />
            </ImageReveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="values-heading" className="bg-stone py-(--spacing-section)">
        <div className={shell}>
          <Reveal>
            <SectionHeading id="values-heading" eyebrow={copy.valuesEyebrow} title={copy.valuesTitle} />
          </Reveal>
          <Stagger as="ul" className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(valueIcons) as (keyof typeof valueIcons)[]).map((key, index) => {
              const Icon = valueIcons[key]
              return (
                <StaggerItem as="li" key={key} className="relative py-8">
                  <div aria-hidden="true" className="road-line absolute inset-x-0 top-0 text-forest" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-coral">{String(index + 1).padStart(2, "0")}</span>
                    <Icon aria-hidden="true" strokeWidth={1.6} className="size-5 text-teal-deep" />
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold tracking-tight text-forest">{copy.values[key].title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{copy.values[key].body}</p>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </section>

      <JourneyStory locale={locale} copy={dictionary.home.story} />
      <CtaSection locale={locale} copy={dictionary.home.cta} />
    </>
  )
}
