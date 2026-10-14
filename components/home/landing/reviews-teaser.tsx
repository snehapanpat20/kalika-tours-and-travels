import { MessageSquareHeart } from "lucide-react"
import { ArrowLink, LandingHeading } from "@/components/home/landing/landing-heading"
import { SnapCarousel } from "@/components/home/landing/snap-carousel"
import { Reveal } from "@/components/motion/reveal"
import { ReviewCard } from "@/components/reviews/review-card"
import { Button } from "@/components/ui/button"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import type { PublicReview } from "@/server/content/reviews"

/**
 * The latest approved reviews as a carousel (one card on phones, three on
 * wide screens). Until there are some, an invitation to write the first one
 * stands in: no review is ever made up.
 */
export function ReviewsTeaser({ locale, dictionary, reviews }: { locale: Locale; dictionary: Dictionary; reviews: PublicReview[] }) {
  const copy = dictionary.home.landing.reviews
  const reviewCopy = dictionary.pages.reviews

  return (
    <section aria-labelledby="reviews-teaser-title" className="bg-ivory py-(--spacing-section)">
      <div className={shell}>
        <Reveal y={24}>
          <LandingHeading
            id="reviews-teaser-title"
            eyebrow={copy.eyebrow}
            lead={copy.lead}
            accent={copy.accent}
            action={reviews.length ? <ArrowLink href={pagePath(locale, "reviews")}>{copy.readAll}</ArrowLink> : undefined}
          />
        </Reveal>

        {reviews.length ? (
          <Reveal y={24} delay={0.1}>
            <SnapCarousel
              label={reviewCopy.title}
              previous={copy.previous}
              next={copy.next}
              autoplay={6000}
              pause={copy.pause}
              play={copy.play}
              className="mt-10"
              listClassName="[&>li]:shrink-0 [&>li]:basis-[88%] md:[&>li]:basis-[calc((100%-1.25rem)/2)] lg:[&>li]:basis-[calc((100%-2.5rem)/3)]"
            >
              {reviews.map((review) => (
                <li key={review.id} className="snap-start [&>article]:h-full">
                  <ReviewCard review={review} locale={locale} starsLabel={reviewCopy.stars} photoAlt={reviewCopy.photoAlt} tripTypes={dictionary.pages.gallery.tripTypes} />
                </li>
              ))}
            </SnapCarousel>
          </Reveal>
        ) : (
          <Reveal className="mt-10">
            <div className="flex flex-col items-start gap-5 rounded-[1.5rem] bg-forest px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <div className="flex items-start gap-4">
                <MessageSquareHeart aria-hidden="true" strokeWidth={1.6} className="mt-1 size-8 shrink-0 text-teal-light" />
                <div>
                  <p className="font-display text-2xl font-semibold">{reviewCopy.emptyTitle}</p>
                  <p className="mt-1 max-w-lg text-white/75">{reviewCopy.emptyBody}</p>
                </div>
              </div>
              <Button href={pagePath(locale, "reviews", "share")} arrow>
                {reviewCopy.share}
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
