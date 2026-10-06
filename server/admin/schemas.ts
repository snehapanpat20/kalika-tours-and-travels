import "server-only"
import { z } from "zod"
import { isIsoDate, travelTypes } from "@/lib/validation/enquiry"

export const enquiryStatuses = ["NEW", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const

export const loginSchema = z.object({
  email: z.string({ error: "Enter your email." }).trim().toLowerCase().pipe(z.email({ error: "Enter a valid email." })),
  password: z.string({ error: "Enter your password." }).min(1, { error: "Enter your password." }).max(200),
})

export const statusUpdateSchema = z.object({
  status: z.enum(enquiryStatuses, { error: `Status must be one of: ${enquiryStatuses.join(", ")}.` }),
})

export const enquiryIdSchema = z.uuid({ error: "Enquiry not found." })

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine(isIsoDate, { error: `${label} must be a date in YYYY-MM-DD format.` })
    .optional()

/** Query string for GET /api/admin/enquiries. Unknown values are rejected, not ignored. */
export const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, { error: "page must be 1 or more." }).default(1),
    pageSize: z.coerce.number().int().min(1).max(100, { error: "pageSize must be between 1 and 100." }).default(20),
    status: z.enum(enquiryStatuses, { error: `status must be one of: ${enquiryStatuses.join(", ")}.` }).optional(),
    travelType: z.enum(travelTypes, { error: `travelType must be one of: ${travelTypes.join(", ")}.` }).optional(),
    from: optionalDate("from"),
    to: optionalDate("to"),
    travelFrom: optionalDate("travelFrom"),
    travelTo: optionalDate("travelTo"),
    search: z.string().trim().max(100, { error: "search must be 100 characters or fewer." }).optional(),
    sort: z.enum(["newest", "oldest", "travelDate"], { error: "sort must be newest, oldest or travelDate." }).default("newest"),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ["to"],
    error: "to must be on or after from.",
  })
  .refine((query) => !query.travelFrom || !query.travelTo || query.travelFrom <= query.travelTo, {
    path: ["travelTo"],
    error: "travelTo must be on or after travelFrom.",
  })

/** Reads URL search params into a plain object, ignoring empty values. */
export function searchParamsToObject(url: string): Record<string, string> {
  const entries = [...new URL(url).searchParams.entries()].filter(([, value]) => value.trim() !== "")
  return Object.fromEntries(entries)
}
