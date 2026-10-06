import { MessageSquareHeart } from "lucide-react"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { ReviewCard } from "@/components/reviews/review-card"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import type { PublicReview } from "@/server/content/reviews"

/** Homepage: the latest approved reviews, or an invitation to write the first one. */
export function ReviewsPreview({
  locale,
  copy,
  tripTypes,
  readAll,
  reviews,
}: {
  locale: Locale
  copy: Dictionary["pages"]["reviews"]
  tripTypes: Dictionary["pages"]["gallery"]["tripTypes"]
  readAll: string
  reviews: PublicReview[]
}) {
  return (
    <section aria-labelledby="reviews-preview-title" className="bg-stone py-(--spacing-section)">
      <div className={shell}>
        <Reveal>
          <SectionHeading
            id="reviews-preview-title"
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
            action={
              reviews.length ? (
                <Button href={pagePath(locale, "reviews")} variant="outline" arrow>
                  {readAll}
                </Button>
              ) : undefined
            }
          />
        </Reveal>

        {reviews.length ? (
          <Stagger as="ul" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <StaggerItem as="li" key={review.id}>
                <ReviewCard review={review} locale={locale} starsLabel={copy.stars} photoAlt={copy.photoAlt} tripTypes={tripTypes} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Reveal className="mt-10">
            <div className="flex flex-col items-start gap-5 rounded-panel bg-forest px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <div className="flex items-start gap-4">
                <MessageSquareHeart aria-hidden="true" strokeWidth={1.6} className="mt-1 size-8 shrink-0 text-teal-light" />
                <div>
                  <p className="text-xl font-extrabold tracking-tight">{copy.emptyTitle}</p>
                  <p className="mt-1 max-w-lg text-white/75">{copy.emptyBody}</p>
                </div>
              </div>
              <Button href={pagePath(locale, "reviews", "share")} arrow>
                {copy.share}
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
