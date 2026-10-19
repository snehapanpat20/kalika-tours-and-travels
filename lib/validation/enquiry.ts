import { z } from "zod"
import { businessRules } from "@/lib/config/business-rules"
import type { FieldIssue } from "@/lib/errors/app-error"
import type { ServiceId } from "@/types/catalog"

/**
 * Enquiry rules shared by the browser form and the API.
 * The API never trusts the browser: it runs this same schema again.
 */

export const travelTypes = ["OUTSTATION", "FAMILY", "GROUP", "PILGRIMAGE", "CORPORATE"] as const
export type TravelType = (typeof travelTypes)[number]

/** Website service ids → API travel types. */
export const travelTypeByService: Record<ServiceId, TravelType> = {
  outstation: "OUTSTATION",
  family: "FAMILY",
  group: "GROUP",
  pilgrimage: "PILGRIMAGE",
  corporate: "CORPORATE",
}

export const MAX_PASSENGERS = businessRules.maxGroupSize
/** How far ahead an enquiry can be made. */
export const BOOKING_HORIZON_DAYS = 730
export const MESSAGE_MAX_LENGTH = 1000

/** API error messages. The website maps each one to its own translated text. */
export const enquiryMessages = {
  fullNameRequired: "Enter your full name.",
  fullNameInvalid: "Enter a valid name using letters only.",
  phoneInvalid: "Enter a valid 10-digit Indian mobile number.",
  emailInvalid: "Enter a valid email address.",
  travelTypeInvalid: "Choose a valid type of trip.",
  destinationRequired: "Enter the destination.",
  destinationInvalid: "Enter a valid destination.",
  travelDateInvalid: "Enter a valid travel date (YYYY-MM-DD).",
  travelDatePast: "Travel date cannot be in the past.",
  travelDateTooFar: "Travel date must be within the next 2 years.",
  returnDateInvalid: "Enter a valid return date (YYYY-MM-DD).",
  returnBeforeTravel: "Return date cannot be before the travel date.",
  passengerCountInvalid: `Passengers must be a whole number from 1 to ${MAX_PASSENGERS}.`,
  messageTooLong: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`,
  messageLinks: "Please remove links from the message.",
} as const

// ─── Helpers ──────────────────────────────────────────────────

/** Removes control characters (keeping line breaks when asked) and trims. */
export function cleanText(value: string, { multiline = false } = {}): string {
  const withoutControl = value
    .replace(/\r\n?/g, "\n")
    .replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, multiline ? "" : " ")
  return multiline
    ? withoutControl.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    : withoutControl.replace(/\s+/g, " ").trim()
}

/**
 * Accepts common ways of writing an Indian mobile number
 * (98765 43210, +91-98765-43210, 098765 43210) and returns +91XXXXXXXXXX.
 */
export function normalizeIndianPhone(raw: string): string | null {
  let digits = raw.replace(/[\s\-().]/g, "")
  if (digits.startsWith("+91")) digits = digits.slice(3)
  else if (digits.startsWith("0091")) digits = digits.slice(4)
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

/** Today's date in India (YYYY-MM-DD), so "past" means the same thing everywhere. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const linkPattern = /(https?:\/\/|www\.)\S+/gi
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u
const destinationPattern = /^[\p{L}\p{M}\p{N} .,'&()/-]+$/u

// ─── Schema ───────────────────────────────────────────────────

const isoDateField = (invalid: string) =>
  z
    .string({ error: invalid })
    .trim()
    .refine(isIsoDate, { error: invalid })

export const enquiryInputSchema = z
  .object({
    fullName: z
      .string({ error: enquiryMessages.fullNameRequired })
      .transform((value) => cleanText(value))
      .pipe(
        z
          .string()
          .min(2, { error: enquiryMessages.fullNameRequired })
          .max(80, { error: enquiryMessages.fullNameInvalid })
          .regex(namePattern, { error: enquiryMessages.fullNameInvalid }),
      ),
    phone: z
      .string({ error: enquiryMessages.phoneInvalid })
      .transform((value, ctx) => {
        const normalized = normalizeIndianPhone(value)
        if (!normalized) {
          ctx.addIssue({ code: "custom", message: enquiryMessages.phoneInvalid })
          return z.NEVER
        }
        return normalized
      }),
    email: z
      .string({ error: enquiryMessages.emailInvalid })
      .trim()
      .toLowerCase()
      .max(254, { error: enquiryMessages.emailInvalid })
      .pipe(z.union([z.literal(""), z.email({ error: enquiryMessages.emailInvalid })]))
      .nullish()
      .transform((value) => value || null),
    travelType: z.enum(travelTypes, { error: enquiryMessages.travelTypeInvalid }),
    destination: z
      .string({ error: enquiryMessages.destinationRequired })
      .transform((value) => cleanText(value))
      .pipe(
        z
          .string()
          .min(2, { error: enquiryMessages.destinationRequired })
          .max(120, { error: enquiryMessages.destinationInvalid })
          .regex(destinationPattern, { error: enquiryMessages.destinationInvalid }),
      ),
    travelDate: isoDateField(enquiryMessages.travelDateInvalid).superRefine((value, ctx) => {
      const today = todayInIndia()
      if (value < today) ctx.addIssue({ code: "custom", message: enquiryMessages.travelDatePast })
      else if (value > addDays(today, BOOKING_HORIZON_DAYS)) ctx.addIssue({ code: "custom", message: enquiryMessages.travelDateTooFar })
    }),
    returnDate: isoDateField(enquiryMessages.returnDateInvalid),
    passengerCount: z.coerce
      .number({ error: enquiryMessages.passengerCountInvalid })
      .int({ error: enquiryMessages.passengerCountInvalid })
      .min(1, { error: enquiryMessages.passengerCountInvalid })
      .max(MAX_PASSENGERS, { error: enquiryMessages.passengerCountInvalid }),
    message: z
      .string({ error: enquiryMessages.messageTooLong })
      .transform((value) => cleanText(value, { multiline: true }))
      .pipe(
        z
          .string()
          .max(MESSAGE_MAX_LENGTH, { error: enquiryMessages.messageTooLong })
          .refine((value) => (value.match(linkPattern) ?? []).length === 0, { error: enquiryMessages.messageLinks }),
      )
      .nullish()
      .transform((value) => value || null),
    locale: z.enum(["en", "mr"]).catch("en").default("en"),
    /** Honeypot. Hidden from people; bots tend to fill it in. */
    website: z.string().max(500).nullish(),
  })
  .refine((value) => value.returnDate >= value.travelDate, {
    path: ["returnDate"],
    error: enquiryMessages.returnBeforeTravel,
    // Compare whenever both dates are valid, even if other fields still have problems
    when: (payload) => {
      const value = payload.value as { travelDate?: unknown; returnDate?: unknown }
      return typeof value?.travelDate === "string" && typeof value?.returnDate === "string" && isIsoDate(value.travelDate.trim()) && isIsoDate(value.returnDate.trim())
    },
  })

/** What a client sends. */
export type EnquiryInput = z.input<typeof enquiryInputSchema>
/** What the server stores, after normalisation. */
export type EnquiryData = z.output<typeof enquiryInputSchema>

/** One message per field, first problem first. */
export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  const seen = new Set<string>()
  const issues: FieldIssue[] = []
  for (const issue of error.issues) {
    const field = issue.path.map(String).join(".") || "body"
    if (seen.has(field)) continue
    seen.add(field)
    issues.push({ field, message: issue.message })
  }
  return issues
}
