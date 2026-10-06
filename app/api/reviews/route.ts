import { AppError } from "@/lib/errors/app-error"
import { REVIEW_PHOTO_MAX_BYTES, reviewFieldIssues, reviewInputSchema } from "@/lib/validation/review"
import { apiRoute, formFields, formFile, ok, preflight, readFormData } from "@/server/api/http"
import { logger } from "@/server/api/logger"
import { enforceRateLimit, getClientIp, rateLimits } from "@/server/api/rate-limit"
import { createReview } from "@/server/content/reviews"

const successMessage = "Thank you for sharing your experience. Your review has been received and will be reviewed before being published."

/**
 * POST /api/reviews (multipart/form-data): a customer submits a review.
 * Stored as PENDING; an admin decides whether it is published.
 */
export const POST = apiRoute(
  async (request) => {
    const ip = getClientIp(request)
    await enforceRateLimit(rateLimits.reviewPerIp, ip)
    await enforceRateLimit(rateLimits.reviewDailyIp, ip)

    // Room for the photo plus the text fields
    const form = await readFormData(request, REVIEW_PHOTO_MAX_BYTES + 64 * 1024)
    const parsed = reviewInputSchema.safeParse(formFields(form))
    if (!parsed.success) throw new AppError("VALIDATION", "Please check the highlighted fields.", 422, reviewFieldIssues(parsed.error))

    // Honeypot filled in: answer like a success, store nothing
    if (parsed.data.website) {
      logger.warn("review_spam_dropped", { reason: "honeypot" })
      return ok({}, { status: 201, message: successMessage })
    }

    await enforceRateLimit(rateLimits.reviewGlobal, "all")
    const review = await createReview(parsed.data, formFile(form, "photo"))
    logger.info("review_submitted", { reviewId: review.id, withPhoto: Boolean(review.photoKey) })

    return ok({ status: "PENDING" }, { status: 201, message: successMessage })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
