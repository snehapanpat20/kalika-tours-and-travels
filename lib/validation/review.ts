import { z } from "zod"
import type { FieldIssue } from "@/lib/errors/app-error"
import { cleanText, travelTypes } from "@/lib/validation/enquiry"

/**
 * Customer review rules shared by the browser form and the API.
 * Reviews are stored as PENDING; nothing here publishes anything.
 */

export const REVIEW_TEXT_MIN = 10
export const REVIEW_TEXT_MAX = 1500
/** Customer photos: largest upload accepted. */
export const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export const reviewMessages = {
  nameRequired: "Enter your name.",
  nameInvalid: "Enter a valid name using letters only.",
  destinationRequired: "Enter the trip or destination.",
  destinationInvalid: "Enter a valid trip or destination.",
  ratingInvalid: "Choose a rating from 1 to 5 stars.",
  reviewShort: `Please write at least ${REVIEW_TEXT_MIN} characters.`,
  reviewLong: `Please keep your review under ${REVIEW_TEXT_MAX} characters.`,
  reviewLinks: "Please remove links from your review.",
  tripTypeInvalid: "Choose a valid type of trip.",
} as const

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u
const destinationPattern = /^[\p{L}\p{M}\p{N} .,'&()/-]+$/u
const linkPattern = /(https?:\/\/|www\.)\S+/gi

export const reviewInputSchema = z.object({
  customerName: z
    .string({ error: reviewMessages.nameRequired })
    .transform((value) => cleanText(value))
    .pipe(
      z
        .string()
        .min(2, { error: reviewMessages.nameRequired })
        .max(60, { error: reviewMessages.nameInvalid })
        .regex(namePattern, { error: reviewMessages.nameInvalid }),
    ),
  destination: z
    .string({ error: reviewMessages.destinationRequired })
    .transform((value) => cleanText(value))
    .pipe(
      z
        .string()
        .min(2, { error: reviewMessages.destinationRequired })
        .max(120, { error: reviewMessages.destinationInvalid })
        .regex(destinationPattern, { error: reviewMessages.destinationInvalid }),
    ),
  tripType: z
    .union([z.literal(""), z.enum(travelTypes, { error: reviewMessages.tripTypeInvalid })])
    .nullish()
    .transform((value) => value || null),
  rating: z.coerce
    .number({ error: reviewMessages.ratingInvalid })
    .int({ error: reviewMessages.ratingInvalid })
    .min(1, { error: reviewMessages.ratingInvalid })
    .max(5, { error: reviewMessages.ratingInvalid }),
  reviewText: z
    .string({ error: reviewMessages.reviewShort })
    .transform((value) => cleanText(value, { multiline: true }))
    .pipe(
      z
        .string()
        .min(REVIEW_TEXT_MIN, { error: reviewMessages.reviewShort })
        .max(REVIEW_TEXT_MAX, { error: reviewMessages.reviewLong })
        .refine((value) => (value.match(linkPattern) ?? []).length === 0, { error: reviewMessages.reviewLinks }),
    ),
  locale: z.enum(["en", "mr"]).catch("en").default("en"),
  /** Honeypot. Hidden from people; bots tend to fill it in. */
  website: z.string().max(500).nullish(),
})

export type ReviewInput = z.input<typeof reviewInputSchema>
export type ReviewData = z.output<typeof reviewInputSchema>

/** One message per field. */
export function reviewFieldIssues(error: z.ZodError): FieldIssue[] {
  const seen = new Set<string>()
  return error.issues.flatMap((issue) => {
    const field = issue.path.map(String).join(".") || "body"
    if (seen.has(field)) return []
    seen.add(field)
    return [{ field, message: issue.message }]
  })
}
