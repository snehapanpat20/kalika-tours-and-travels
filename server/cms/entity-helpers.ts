import "server-only"
import { z } from "zod"
import { LINK_ERROR, isValidLink } from "@/lib/cms/links"
import { fromIstInput } from "@/lib/cms/schedule"
import type { Locale } from "@/lib/i18n/locales"
import { AppError } from "@/lib/errors/app-error"
import { cleanText } from "@/lib/validation/enquiry"
import { removeStoredImage, resolveImageInput, type ImageFolder, type StoredImage } from "@/server/storage/images"

// ─── Form fields (multipart forms send everything as strings) ───

export const requiredText = (max: number, label: string, options: { multiline?: boolean } = {}) =>
  z
    .string({ error: `Enter ${label.toLowerCase()}.` })
    .max(max * 2)
    .transform((value) => cleanText(value, options))
    .pipe(z.string().min(1, { error: `Enter ${label.toLowerCase()}.` }).max(max, { error: `${label} must be ${max} characters or fewer.` }))

export const optionalText = (max: number, label: string, options: { multiline?: boolean } = {}) =>
  z
    .string()
    .max(max * 2)
    .transform((value) => cleanText(value, options))
    .pipe(z.string().max(max, { error: `${label} must be ${max} characters or fewer.` }))
    .nullish()
    .transform((value) => value || null)

export const formBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || value === "true" || value === "on" || value === "1")

export const sortOrderField = z.coerce
  .number({ error: "Display order must be a whole number." })
  .int({ error: "Display order must be a whole number." })
  .min(-9999)
  .max(9999)

export const linkField = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value || isValidLink(value), { error: LINK_ERROR })
  .nullish()
  .transform((value) => value || null)

/** A date and time typed in India time ("2026-10-10T09:30"), or empty. */
export const istDateTime = (label: string) =>
  z
    .string()
    .trim()
    .nullish()
    .transform((value, ctx) => {
      if (!value) return null
      const date = fromIstInput(value)
      if (!date) {
        ctx.addIssue({ code: "custom", message: `${label} is not a valid date and time.` })
        return z.NEVER
      }
      return date
    })

export const imagePathField = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null)

/** End must come after start, when both are set. */
export function checkDateOrder<T extends { startsAt?: Date | null; endsAt?: Date | null }>(value: T, ctx: z.RefinementCtx) {
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." })
  }
}

// ─── Images on content items ──────────────────────────────────

export type ImageColumns = { imageUrl: string | null; imageKey: string | null; imageWidth: number | null; imageHeight: number | null }

export const IMAGE_MAX_BYTES = 12 * 1024 * 1024

/**
 * Works out the new image columns from a form: a new upload, a website image,
 * "remove", or no change (undefined). Call `commit()` after the database write
 * succeeds (removes the replaced upload) or `rollback()` if it fails.
 */
export async function prepareImageChange(
  input: { file: File | null; imagePath: string | null; remove: boolean },
  folder: ImageFolder,
  currentKey: string | null,
) {
  let image: StoredImage | null = null
  let columns: ImageColumns | undefined
  if (input.file || input.imagePath) {
    image = await resolveImageInput({ file: input.file, imagePath: input.imagePath }, folder, { maxBytes: IMAGE_MAX_BYTES, maxDimension: 2400, field: "image" })
    if (image) columns = { imageUrl: image.url, imageKey: image.key, imageWidth: image.width, imageHeight: image.height }
  } else if (input.remove) {
    columns = { imageUrl: null, imageKey: null, imageWidth: null, imageHeight: null }
  }
  return {
    columns,
    commit: async () => {
      if (columns && currentKey && currentKey !== columns.imageKey) await removeStoredImage(currentKey)
    },
    rollback: async () => {
      if (image?.key) await removeStoredImage(image.key)
    },
  }
}

// ─── Public output ────────────────────────────────────────────

/** Marathi text when the admin wrote it, otherwise the English text. */
export function pick(locale: Locale, english: string, marathi: string | null | undefined): string
export function pick(locale: Locale, english: string | null, marathi: string | null | undefined): string | null
export function pick(locale: Locale, english: string | null, marathi: string | null | undefined): string | null {
  return locale === "mr" && marathi ? marathi : english
}

export function notFound(label: string) {
  return new AppError("NOT_FOUND", `${label} not found.`, 404)
}

export type Paginated<T> = { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }
}

export const listQueryBase = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
}
