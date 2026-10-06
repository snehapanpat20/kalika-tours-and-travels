import "server-only"
import { z } from "zod"
import { cleanText, isIsoDate, travelTypes } from "@/lib/validation/enquiry"

/** Form fields arrive as strings; "true"/"on" mean yes. */
const formBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || value === "true" || value === "on" || value === "1")

const optionalText = (max: number, label: string) =>
  z
    .string()
    .transform((value) => cleanText(value))
    .pipe(z.string().max(max, { error: `${label} must be ${max} characters or fewer.` }))
    .nullish()
    .transform((value) => value || null)

const optionalTripType = z
  .union([z.literal(""), z.enum(travelTypes, { error: "Choose a valid trip type." })])
  .nullish()
  .transform((value) => value || null)

const sortOrder = z.coerce.number({ error: "Sort order must be a whole number." }).int({ error: "Sort order must be a whole number." }).min(-9999).max(9999)

/** Fields of a gallery item, as sent by the admin form (multipart). No defaults here: see below. */
const galleryShape = z.object({
  title: z
    .string({ error: "Enter a title." })
    .transform((value) => cleanText(value))
    .pipe(z.string().min(1, { error: "Enter a title." }).max(120, { error: "Title must be 120 characters or fewer." })),
  altText: optionalText(200, "Alt text"),
  caption: z
    .string()
    .transform((value) => cleanText(value, { multiline: true }))
    .pipe(z.string().max(500, { error: "Caption must be 500 characters or fewer." }))
    .nullish()
    .transform((value) => value || null),
  destination: optionalText(120, "Destination"),
  tripType: optionalTripType,
  tripDate: z
    .union([z.literal(""), z.string().trim().refine(isIsoDate, { error: "Enter the date as YYYY-MM-DD." })])
    .nullish()
    .transform((value) => value || null),
  featured: formBoolean,
  published: formBoolean,
  sortOrder,
  /** Use an image already bundled with the website instead of uploading one. */
  imagePath: z
    .string()
    .trim()
    .nullish()
    .transform((value) => value || null),
})

/** A new item: unchecked boxes and an empty sort order fall back to defaults. */
export const galleryFieldsSchema = galleryShape.extend({
  featured: formBoolean.default(false),
  published: formBoolean.default(false),
  sortOrder: sortOrder.default(0),
})

/**
 * Partial update: only the fields that were sent. Built from the shape
 * without defaults, because Zod applies a field's default even inside
 * .partial(), which would reset featured/published/sortOrder on every edit.
 */
export const galleryUpdateSchema = galleryShape.partial()

export const galleryListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().max(100).optional(),
  visibility: z.enum(["published", "draft"]).optional(),
  featured: z.enum(["yes"]).optional(),
  tripType: z.enum(travelTypes).optional(),
  sort: z.enum(["order", "newest", "tripDate"]).default("order"),
})

export const reviewStatuses = ["PENDING", "APPROVED", "REJECTED"] as const

export const reviewListSchema = z.object({
  status: z.enum(reviewStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
})

/** Admin edits to a review. The customer's own words are not editable. */
export const reviewUpdateSchema = z
  .object({
    status: z.enum(reviewStatuses, { error: "Status must be PENDING, APPROVED or REJECTED." }).optional(),
    customerName: z
      .string()
      .transform((value) => cleanText(value))
      .pipe(z.string().min(2, { error: "Name must be at least 2 characters." }).max(60))
      .optional(),
    destination: z
      .string()
      .transform((value) => cleanText(value))
      .pipe(z.string().min(2, { error: "Destination must be at least 2 characters." }).max(120))
      .optional(),
    tripType: optionalTripType.optional(),
    removePhoto: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), { error: "Nothing to update." })
