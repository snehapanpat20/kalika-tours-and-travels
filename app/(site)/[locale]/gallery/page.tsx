import type { Metadata } from "next"
import { GalleryWall } from "@/components/gallery/gallery-wall"
import { PageHero } from "@/components/layout/page-hero"
import { Reveal } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { Button } from "@/components/ui/button"
import { InstagramIcon } from "@/components/ui/icons"
import { shell } from "@/components/ui/styles"
import { PageCTA } from "@/components/sections/page-cta"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { business } from "@/data/business"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { createPageMetadata } from "@/lib/seo/metadata"
import { listPublishedGallery } from "@/server/content/gallery"

/** Published photos change from the admin panel, which also revalidates this page. */
export const revalidate = 600

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "gallery") : {}
}

export default async function GalleryPage(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "gallery")
  const copy = dictionary.pages.gallery
  const items = await listPublishedGallery(preview)

  return (
    <>
      <PageStructuredData locale={locale} page="gallery" crumbs={crumbs} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="gallery-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.title}
        description={copy.description}
        image={pageImages.galleryHero}
        vivid
        imageAlt={copy.imageAlt}
      />

      <section aria-label={copy.title} className="bg-ivory py-(--spacing-section)">
        <div className={shell}>
          <GalleryWall
            items={items}
            locale={locale}
            labels={{
              filterLabel: copy.filterLabel,
              all: copy.all,
              tripTypes: copy.tripTypes,
              emptyFiltered: copy.emptyFiltered,
              openPhoto: copy.openPhoto,
              lightbox: copy.lightbox,
            }}
            empty={
              <Reveal>
                <div className="flex flex-col items-center gap-5 rounded-panel border border-dashed border-line bg-stone px-6 py-16 text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight text-forest">{copy.emptyTitle}</h2>
                  <p className="max-w-md text-muted">{copy.emptyBody}</p>
                  <Button href={business.instagramUrl} variant="outline" icon={<InstagramIcon className="-ml-1 size-[1.125rem] text-coral" />}>
                    {copy.followInstagram}
                  </Button>
                </div>
              </Reveal>
            }
          />
        </div>
      </section>
      <PageCTA pageKey="gallery" locale={locale} dictionary={dictionary} />
    </>
  )
}
