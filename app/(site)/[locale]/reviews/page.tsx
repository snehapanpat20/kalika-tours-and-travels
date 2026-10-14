import type { Metadata } from "next"
import { MessageSquareHeart } from "lucide-react"
import { PageHero } from "@/components/layout/page-hero"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { pageImages } from "@/components/pages/page-images"
import { ReviewCard, StarRating } from "@/components/reviews/review-card"
import { ReviewForm } from "@/components/reviews/review-form"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import { PageCTA } from "@/components/sections/page-cta"
import { PageStructuredData, pageCrumbs } from "@/components/seo/page-structured-data"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { createPageMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/utils/cn"
import { listApprovedReviews } from "@/server/content/reviews"
import { getStorageStatus } from "@/server/storage"

/** Moderation in the admin panel revalidates this page when a review is approved. */
export const revalidate = 600

/** An average is only shown once there are enough real reviews for it to mean something. */
const MIN_REVIEWS_FOR_AVERAGE = 5

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "reviews") : {}
}

export default async function ReviewsPage(props: LocaleParams) {
  const { locale, dictionary } = await resolvePageLocale(props)
  const crumbs = pageCrumbs(locale, dictionary, "reviews")
  const copy = dictionary.pages.reviews
  const tripTypes = dictionary.pages.gallery.tripTypes
  const reviews = await listApprovedReviews()

  const average = reviews.length >= MIN_REVIEWS_FOR_AVERAGE ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null
  const averageText = average
    ? copy.average.replace("{average}", average.toFixed(1)).replace("{count}", String(reviews.length))
    : null

  return (
    <>
      <PageStructuredData locale={locale} page="reviews" crumbs={crumbs} />
      <PageHero
        breadcrumbs={{ crumbs, label: dictionary.seo.breadcrumbLabel }}
        id="reviews-title"
        eyebrow={copy.eyebrow}
        titleLead={copy.title}
        description={copy.description}
        image={pageImages.reviewsHero}
        vivid
        imageAlt={copy.imageAlt}
        actions={
          <Button href="#share" variant="inverse" size="lg" arrow className="w-full sm:w-auto">
            {copy.share}
          </Button>
        }
      />

      <section aria-label={copy.title} className="bg-stone py-(--spacing-section)">
        <div className={shell}>
          {averageText && average ? (
            <Reveal className="mb-10 flex flex-wrap items-center gap-3">
              <StarRating rating={Math.round(average)} label={averageText} className="[&_svg]:size-5" />
              <p className="font-bold text-forest">{averageText}</p>
            </Reveal>
          ) : null}

          {reviews.length ? (
            <Stagger as="ul" className="columns-1 gap-4 md:columns-2 lg:columns-3 [&>li]:mb-4">
              {reviews.map((review) => (
                <StaggerItem as="li" key={review.id} className="break-inside-avoid">
                  <ReviewCard review={review} locale={locale} starsLabel={copy.stars} photoAlt={copy.photoAlt} tripTypes={tripTypes} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Reveal>
              <div className="flex flex-col items-center gap-4 rounded-panel bg-forest px-6 py-14 text-center text-white">
                <MessageSquareHeart aria-hidden="true" strokeWidth={1.5} className="size-10 text-teal-light" />
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.emptyTitle}</h2>
                <p className="max-w-md text-white/75">{copy.emptyBody}</p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <section id="share" aria-labelledby="share-title" className="bg-ivory py-(--spacing-section)">
        <div className={cn(shell, "grid gap-10 lg:grid-cols-12 lg:gap-14")}>
          <Reveal className="lg:col-span-4">
            <SectionHeading id="share-title" eyebrow={copy.shareEyebrow} title={copy.shareTitle} description={copy.shareDescription} />
          </Reveal>
          <div className="lg:col-span-8">
            <div className="rounded-panel bg-white p-6 shadow-card ring-1 ring-forest/5 sm:p-8 lg:p-10">
              <ReviewForm locale={locale} copy={copy.form} tripTypes={tripTypes} photoUploadsEnabled={getStorageStatus().enabled} />
            </div>
          </div>
        </div>
      </section>
      <PageCTA pageKey="reviews" locale={locale} dictionary={dictionary} />
    </>
  )
}
