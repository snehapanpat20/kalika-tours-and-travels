import Image from "next/image"
import { Quote, Star } from "lucide-react"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import type { PublicReview } from "@/server/content/reviews"
import type { TravelTypeKey } from "@/types/home"

/** Five stars, filled up to `rating`, with a text label for screen readers. */
export function StarRating({ rating, label, className }: { rating: number; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} aria-hidden="true" strokeWidth={1.6} className={cn("size-4", value <= rating ? "fill-highlight text-highlight" : "fill-transparent text-line")} />
      ))}
    </span>
  )
}

function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso))
}

/** One approved customer review. Shown exactly as written; nothing is embellished. */
export function ReviewCard({
  review,
  locale,
  starsLabel,
  photoAlt,
  tripTypes,
}: {
  review: PublicReview
  locale: Locale
  starsLabel: string
  photoAlt: string
  tripTypes: Record<TravelTypeKey, string>
}) {
  return (
    <article className="flex flex-col rounded-card border border-line bg-ivory p-6 shadow-soft sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <StarRating rating={review.rating} label={starsLabel.replace("{rating}", String(review.rating))} />
        <Quote aria-hidden="true" className="size-6 text-teal-soft" />
      </div>
      <p className="mt-4 leading-relaxed whitespace-pre-line text-ink">{review.reviewText}</p>
      {review.photoUrl ? (
        <div className="relative mt-5 overflow-hidden rounded-xl bg-stone-deep">
          <Image
            src={review.photoUrl}
            alt={photoAlt.replace("{name}", review.customerName)}
            width={review.photoWidth ?? 1200}
            height={review.photoHeight ?? 900}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="h-auto w-full"
          />
        </div>
      ) : null}
      <footer className="mt-5 border-t border-line pt-4">
        <p className="font-bold text-forest">{review.customerName}</p>
        <p className="mt-0.5 text-sm text-muted">
          {[review.destination, review.tripType ? tripTypes[review.tripType] : null, formatDate(review.createdAt, locale)].filter(Boolean).join(" · ")}
        </p>
      </footer>
    </article>
  )
}
