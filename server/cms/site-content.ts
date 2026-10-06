import "server-only"
import { cache } from "react"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import type {
  ContentImage,
  LocalizedText,
  PhotoInput,
  SectionContent,
  SectionDraftInput,
  SectionState,
  TravellerPhoto,
} from "@/lib/cms/content-types"
import { emptySectionContent } from "@/lib/cms/content-types"
import { cmsIconNames } from "@/lib/cms/icons"
import { LINK_ERROR, isValidLink } from "@/lib/cms/links"
import { getPath, setExistingStringPath } from "@/lib/cms/object-path"
import { MAX_TRAVELLER_FEATURES, MAX_TRAVELLER_PHOTOS, contentSections, getSection, type ContentSection } from "@/lib/cms/sections"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { AppError } from "@/lib/errors/app-error"
import { cleanText } from "@/lib/validation/enquiry"
import { describeError, logger } from "@/server/api/logger"
import { refreshPublicPages } from "@/server/content/gallery"
import { getPrisma } from "@/server/db/prisma"
import { removeStoredImage, resolveImageInput, type StoredImage } from "@/server/storage/images"

export const CONTENT_IMAGE_MAX_BYTES = 12 * 1024 * 1024
/** Room for a hero image plus several Traveller photos in one save. */
export const CONTENT_REQUEST_MAX_BYTES = 40 * 1024 * 1024

// ─── Validation ───────────────────────────────────────────────

const localized = (max: number, label: string) =>
  z.object({
    en: z.string().max(max * 2).transform((value) => cleanText(value)).pipe(z.string().max(max, { error: `${label} must be ${max} characters or fewer.` })),
    mr: z.string().max(max * 2).transform((value) => cleanText(value)).pipe(z.string().max(max, { error: `${label} (Marathi) must be ${max} characters or fewer.` })),
  })

const imageChoice = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("keep") }),
  z.object({ kind: z.literal("remove") }),
  z.object({ kind: z.literal("upload"), file: z.string().regex(/^[a-z0-9_]{1,20}$/) }),
  z.object({ kind: z.literal("website"), path: z.string().max(300) }),
])

/** Builds the validator for one section, so only its own fields are accepted. */
function draftSchema(section: ContentSection) {
  const textFor = (language: "en" | "mr") =>
    z
      .object(
        Object.fromEntries(
          section.fields.map((field) => [
            field.name,
            z
              .string()
              .max(field.max * 2)
              .transform((value) => cleanText(value, { multiline: field.multiline }))
              .pipe(z.string().max(field.max, { error: `${field.label}${language === "mr" ? " (Marathi)" : ""} must be ${field.max} characters or fewer.` }))
              .optional(),
          ]),
        ),
      )
      .strict()
      .default({})

  const linkNames = (section.links ?? []).map((link) => link.name)
  const photo = {
    alt: localized(200, "Photo description"),
    caption: localized(200, "Photo caption"),
  }

  return z.object({
    text: z.object({ en: textFor("en"), mr: textFor("mr") }),
    links: z
      .record(z.string(), z.string().trim().max(500))
      .default({})
      .refine((links) => Object.keys(links).every((name) => linkNames.includes(name)), { error: "Unknown button." })
      .refine((links) => Object.values(links).every((value) => !value || isValidLink(value)), { error: LINK_ERROR }),
    image: section.image ? imageChoice : z.object({ kind: z.literal("keep") }).default({ kind: "keep" }),
    features: section.features
      ? z
          .array(z.object({ icon: z.enum(cmsIconNames), text: localized(60, "Feature") }))
          .max(MAX_TRAVELLER_FEATURES, { error: `Add up to ${MAX_TRAVELLER_FEATURES} features.` })
          .refine((list) => list.every((feature) => feature.text.en || feature.text.mr), { error: "Every feature needs a name." })
      : z.array(z.never()).max(0).default([]),
    photos: section.photos
      ? z
          .array(
            z.discriminatedUnion("kind", [
              z.object({ kind: z.literal("existing"), url: z.string().max(500), ...photo }),
              z.object({ kind: z.literal("upload"), file: z.string().regex(/^[a-z0-9_]{1,20}$/), ...photo }),
              z.object({ kind: z.literal("website"), path: z.string().max(300), ...photo }),
            ]),
          )
          .max(MAX_TRAVELLER_PHOTOS, { error: `Add up to ${MAX_TRAVELLER_PHOTOS} photos.` })
      : z.array(z.never()).max(0).default([]),
  })
}

export function parseDraftInput(section: ContentSection, raw: unknown): SectionDraftInput {
  const parsed = draftSchema(section).safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const message = issue?.message ?? "Some fields are not valid."
    throw new AppError("VALIDATION", message, 422, [{ field: issue?.path.join(".") || "content", message }])
  }
  const data = parsed.data
  // Drop empty strings: they mean "use the built-in text"
  const compact = (record: Record<string, string | undefined>) =>
    Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => Boolean(entry[1])))
  return {
    text: { en: compact(data.text.en), mr: compact(data.text.mr) },
    links: compact(data.links),
    image: data.image as SectionDraftInput["image"],
    features: data.features,
    photos: data.photos as PhotoInput[],
  }
}

// ─── Stored JSON ──────────────────────────────────────────────

const storedImage = z.object({ url: z.string(), key: z.string().nullable(), width: z.number(), height: z.number() })
const storedLocalized = z.object({ en: z.string(), mr: z.string() })
const storedContent = z.object({
  text: z.object({ en: z.record(z.string(), z.string()), mr: z.record(z.string(), z.string()) }),
  image: storedImage.nullable(),
  links: z.record(z.string(), z.string()),
  features: z.array(z.object({ icon: z.enum(cmsIconNames), text: storedLocalized })),
  photos: z.array(storedImage.extend({ alt: storedLocalized, caption: storedLocalized })),
})

/** Reads stored JSON defensively: anything unexpected becomes "no override". */
function readStored(value: Prisma.JsonValue | null | undefined): SectionContent | null {
  if (value === null || value === undefined) return null
  const parsed = storedContent.safeParse(value)
  return parsed.success ? parsed.data : emptySectionContent()
}

const imageKeys = (content: SectionContent | null): Set<string> => {
  const keys = new Set<string>()
  if (content?.image?.key) keys.add(content.image.key)
  for (const photo of content?.photos ?? []) if (photo.key) keys.add(photo.key)
  return keys
}

const sameContent = (a: SectionContent | null, b: SectionContent | null) => JSON.stringify(a) === JSON.stringify(b)

// ─── Admin ────────────────────────────────────────────────────

function toState(key: string, row: { draft: Prisma.JsonValue; published: Prisma.JsonValue | null; publishedAt: Date | null; updatedAt: Date } | undefined): SectionState {
  const draft = readStored(row?.draft) ?? emptySectionContent()
  const published = readStored(row?.published)
  return {
    key,
    draft,
    published,
    publishedAt: row?.publishedAt?.toISOString() ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    hasUnpublishedChanges: row ? !sameContent(draft, published ?? emptySectionContent()) : false,
  }
}

export async function adminListSections(): Promise<SectionState[]> {
  const rows = await getPrisma().siteContent.findMany()
  return contentSections.map((section) => toState(section.key, rows.find((row) => row.key === section.key)))
}

export async function adminGetSection(key: string): Promise<SectionState> {
  const row = await getPrisma().siteContent.findUnique({ where: { key } })
  return toState(key, row ?? undefined)
}

export function requireSection(key: string): ContentSection {
  const section = getSection(key)
  if (!section) throw new AppError("NOT_FOUND", "That website section does not exist.", 404)
  return section
}

const imageOptions = (field: string, minWidth?: number) => ({ maxBytes: CONTENT_IMAGE_MAX_BYTES, maxDimension: 2400, field, minWidth })

/**
 * Saves a draft. New uploads are stored first; if anything fails they are
 * removed again. Files no longer used by the draft or the live version are deleted.
 */
export async function saveSectionDraft(section: ContentSection, input: SectionDraftInput, files: Map<string, File>) {
  const prisma = getPrisma()
  const row = await prisma.siteContent.findUnique({ where: { key: section.key } })
  const previousDraft = readStored(row?.draft) ?? emptySectionContent()
  const published = readStored(row?.published)
  const stored: StoredImage[] = []

  const store = async (choice: { file: File | null; imagePath: string | null }, field: string, minWidth?: number) => {
    const image = await resolveImageInput(choice, "content", imageOptions(field, minWidth))
    if (image?.key) stored.push(image)
    return image
  }
  const fileFor = (name: string, field: string) => {
    const file = files.get(name)
    if (!file) throw new AppError("VALIDATION", "A chosen photo did not arrive. Please try again.", 422, [{ field, message: "Please choose the photo again." }])
    return file
  }

  try {
    let image: ContentImage | null = previousDraft.image
    if (section.image) {
      const choice = input.image
      if (choice.kind === "remove") image = null
      if (choice.kind === "upload") image = await store({ file: fileFor(choice.file, "image"), imagePath: null }, "image", section.image.minWidth)
      if (choice.kind === "website") image = await store({ file: null, imagePath: choice.path }, "image")
    }

    // Existing photos must be ones this section already has: no arbitrary URLs
    const known = new Map<string, TravellerPhoto>()
    for (const photo of [...previousDraft.photos, ...(published?.photos ?? [])]) known.set(photo.url, photo)
    const photos: TravellerPhoto[] = []
    for (const [index, photo] of input.photos.entries()) {
      const field = `photos.${index}`
      const meta = { alt: photo.alt as LocalizedText, caption: photo.caption as LocalizedText }
      if (photo.kind === "existing") {
        const existing = known.get(photo.url)
        if (!existing) throw new AppError("VALIDATION", "One of the photos is no longer available. Please reload the page.", 422, [{ field, message: "Photo not found." }])
        photos.push({ ...existing, ...meta })
      } else {
        const storedImage =
          photo.kind === "upload" ? await store({ file: fileFor(photo.file, field), imagePath: null }, field) : await store({ file: null, imagePath: photo.path }, field)
        if (storedImage) photos.push({ ...storedImage, ...meta })
      }
    }

    const draft: SectionContent = { text: input.text, links: input.links, image, features: input.features, photos }
    await prisma.siteContent.upsert({
      where: { key: section.key },
      create: { key: section.key, draft: draft as unknown as Prisma.InputJsonObject },
      update: { draft: draft as unknown as Prisma.InputJsonObject },
    })

    // Files the old draft used that neither the new draft nor the live version uses
    const keep = new Set([...imageKeys(draft), ...imageKeys(published)])
    for (const key of imageKeys(previousDraft)) if (!keep.has(key)) await removeStoredImage(key)
    return adminGetSection(section.key)
  } catch (error) {
    for (const image of stored) await removeStoredImage(image.key)
    throw error
  }
}

/** Makes the saved draft live. */
export async function publishSection(section: ContentSection) {
  const prisma = getPrisma()
  const row = await prisma.siteContent.findUnique({ where: { key: section.key } })
  if (!row) throw new AppError("CONFLICT", "There is nothing to publish yet. Save your changes first.", 409)
  const previousPublished = readStored(row.published)
  const draft = readStored(row.draft) ?? emptySectionContent()
  await prisma.siteContent.update({ where: { key: section.key }, data: { published: draft as unknown as Prisma.InputJsonObject, publishedAt: new Date() } })
  const keep = imageKeys(draft)
  for (const key of imageKeys(previousPublished)) if (!keep.has(key)) await removeStoredImage(key)
  refreshPublicPages()
  return adminGetSection(section.key)
}

/** Throws away unpublished changes: the draft goes back to what is live. */
export async function discardSectionDraft(section: ContentSection) {
  const prisma = getPrisma()
  const row = await prisma.siteContent.findUnique({ where: { key: section.key } })
  if (!row) return adminGetSection(section.key)
  const draft = readStored(row.draft) ?? emptySectionContent()
  const published = readStored(row.published) ?? emptySectionContent()
  await prisma.siteContent.update({ where: { key: section.key }, data: { draft: published as unknown as Prisma.InputJsonObject } })
  const keep = imageKeys(published)
  for (const key of imageKeys(draft)) if (!keep.has(key)) await removeStoredImage(key)
  return adminGetSection(section.key)
}

/** The built-in text for every field, shown in the editor as the starting point. */
export function sectionDefaults(section: ContentSection): { en: Record<string, string>; mr: Record<string, string> } {
  const read = (locale: Locale) =>
    Object.fromEntries(section.fields.map((field) => [field.name, String(getPath(getDictionary(locale), field.path) ?? "")]))
  return { en: read("en"), mr: read("mr") }
}

// ─── Public website ───────────────────────────────────────────

/**
 * What the website shows for each section: the published version, or the
 * draft when an admin is previewing. One query per request; if the database
 * is unavailable the site falls back to its built-in content.
 */
export const getLiveSections = cache(async (preview: boolean): Promise<Partial<Record<string, SectionContent>>> => {
  try {
    const rows = await getPrisma().siteContent.findMany()
    return Object.fromEntries(
      rows.flatMap((row) => {
        const content = readStored(preview ? row.draft : row.published)
        return content ? [[row.key, content]] : []
      }),
    )
  } catch (error) {
    logger.error("site_content_read_failed", describeError(error))
    return {}
  }
})

/** The dictionary with admin-edited text applied over the built-in copy. */
export async function getSiteDictionary(locale: Locale, preview: boolean): Promise<Dictionary> {
  const base = getDictionary(locale)
  const sections = await getLiveSections(preview)
  if (!Object.keys(sections).length) return base

  const dictionary = structuredClone(base) as unknown as Record<string, unknown>
  for (const section of contentSections) {
    const content = sections[section.key]
    if (!content) continue
    for (const field of section.fields) {
      // Each language uses its own edit; with no Marathi edit, the built-in Marathi text stays
      const value = content.text[locale]?.[field.name]
      if (value) setExistingStringPath(dictionary, field.path, value)
    }
  }
  return dictionary as unknown as Dictionary
}

/** Pieces of a section that are not plain text: image, button links, features, photos. */
export async function getSectionExtras(key: string, preview: boolean): Promise<SectionContent | null> {
  return (await getLiveSections(preview))[key] ?? null
}
