import "server-only"
import { z } from "zod"
import type { Destination, DestinationCategory, Prisma } from "@/generated/prisma/client"
import { builtInDestinationGroups, builtInPlaceImages, type BuiltInGroupId } from "@/components/pages/destination-groups"
import { findNamedImage } from "@/lib/config/media-file"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { AppError } from "@/lib/errors/app-error"
import { DESTINATION_PAGE_MIN_DESCRIPTION, SLUG_MAX, SLUG_PATTERN, slugify } from "@/lib/cms/slug"
import { describeError, logger } from "@/server/api/logger"
import {
  formBoolean,
  imagePathField,
  listQueryBase,
  notFound,
  optionalText,
  paginate,
  pick,
  prepareImageChange,
  requiredText,
  sortOrderField,
} from "@/server/cms/entity-helpers"
import { refreshPublicPages } from "@/server/content/gallery"
import { getPrisma } from "@/server/db/prisma"
import { bundledImageSize, removeStoredImage } from "@/server/storage/images"

/** Empty means "make one from the name" (new destinations) or "keep the current one" (edits). */
const slugField = z
  .string()
  .max(SLUG_MAX * 2)
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .max(SLUG_MAX, { error: `Web address must be ${SLUG_MAX} characters or fewer.` })
        .regex(SLUG_PATTERN, { error: "Use only lowercase letters, numbers and single hyphens in the web address (for example: mahabaleshwar)." }),
    ]),
  )
  .nullish()
  .transform((value) => value || null)

/** `base`, or `base-2`, `base-3`… — the first one no other destination uses. */
async function freeSlug(base: string, exceptId?: string, taken: Set<string> = new Set()): Promise<string> {
  const rows = await getPrisma().destination.findMany({
    where: { slug: { startsWith: base }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { slug: true },
  })
  const used = new Set([...rows.map((row) => row.slug), ...taken])
  if (!used.has(base)) return base
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, "")}${suffix}`
    if (!used.has(candidate)) return candidate
  }
}

/** A slug the admin typed must not already belong to another destination. */
async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await getPrisma().destination.findFirst({ where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { name: true } })
  if (clash) {
    throw new AppError("CONFLICT", `The web address "${slug}" is already used by ${clash.name}.`, 409, [
      { field: "slug", message: `Already used by ${clash.name}. Choose a different web address.` },
    ])
  }
}

/** Two saves racing for the same slug: the database unique index decides; report it like the check above. */
function slugRace(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    throw new AppError("CONFLICT", "That web address was just taken by another destination. Choose a different one.", 409, [
      { field: "slug", message: "Already used. Choose a different web address." },
    ])
  }
  throw error
}

export const destinationCategories = ["MAHARASHTRA", "OTHER_STATES", "PILGRIMAGE", "FAMILY", "GROUP", "CORPORATE", "OUTSTATION"] as const satisfies readonly DestinationCategory[]

const destinationShape = z.object({
  name: requiredText(80, "Destination name"),
  nameMr: optionalText(80, "Marathi name"),
  state: optionalText(80, "State"),
  country: requiredText(80, "Country"),
  shortDescription: requiredText(240, "Short description"),
  shortDescriptionMr: optionalText(240, "Marathi short description"),
  description: optionalText(2000, "Description", { multiline: true }),
  descriptionMr: optionalText(2000, "Marathi description", { multiline: true }),
  category: z.enum(destinationCategories, { error: "Choose a category." }),
  imageAlt: optionalText(200, "Photo description"),
  published: formBoolean,
  sortOrder: sortOrderField,
  imagePath: imagePathField,
  removeImage: formBoolean,
  slug: slugField,
  seoTitle: optionalText(70, "SEO title"),
  seoDescription: optionalText(170, "Meta description"),
})

export const destinationCreateSchema = destinationShape.extend({
  country: requiredText(80, "Country").default("India"),
  published: formBoolean.default(false),
  sortOrder: sortOrderField.default(0),
  removeImage: formBoolean.default(false),
})
export const destinationUpdateSchema = destinationShape.partial()

export type DestinationInput = z.infer<typeof destinationUpdateSchema>

export const destinationListSchema = z.object({
  ...listQueryBase,
  category: z.enum(destinationCategories).optional(),
  visibility: z.enum(["published", "draft"]).optional(),
})

export function serializeDestination(item: Destination) {
  return {
    id: item.id,
    name: item.name,
    nameMr: item.nameMr,
    state: item.state,
    country: item.country,
    shortDescription: item.shortDescription,
    shortDescriptionMr: item.shortDescriptionMr,
    description: item.description,
    descriptionMr: item.descriptionMr,
    category: item.category,
    imageUrl: item.imageUrl,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
    imageAlt: item.imageAlt,
    slug: item.slug,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    uploaded: Boolean(item.imageKey),
    published: item.published,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export type AdminDestination = ReturnType<typeof serializeDestination>

function dataFrom(input: DestinationInput): Omit<DestinationInput, "imagePath" | "removeImage" | "slug"> {
  const data = { ...input }
  delete data.imagePath
  delete data.removeImage
  delete data.slug
  return data
}

export async function adminListDestinations(query: z.infer<typeof destinationListSchema>) {
  const where: Prisma.DestinationWhereInput = {}
  if (query.category) where.category = query.category
  if (query.visibility) where.published = query.visibility === "published"
  const search = query.search?.trim()
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { shortDescription: { contains: search, mode: "insensitive" } },
      { slug: { contains: search.toLowerCase() } },
    ]
  }
  const prisma = getPrisma()
  const [total, rows, all] = await prisma.$transaction([
    prisma.destination.count({ where }),
    prisma.destination.findMany({ where, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.destination.count(),
  ])
  return { ...paginate(rows.map(serializeDestination), total, query.page, query.pageSize), counts: { all } }
}

async function findDestination(id: string) {
  const item = await getPrisma().destination.findUnique({ where: { id } })
  if (!item) throw notFound("Destination")
  return item
}

export async function getDestination(id: string) {
  return serializeDestination(await findDestination(id))
}

export async function createDestination(input: z.infer<typeof destinationCreateSchema>, file: File | null) {
  if (input.slug) await assertSlugFree(input.slug)
  const slug = input.slug ?? (await freeSlug(slugify(input.name)))
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: false }, "destinations", null)
  try {
    const item = await getPrisma().destination.create({ data: { ...dataFrom(input), slug, ...image.columns } as Prisma.DestinationCreateInput })
    refreshPublicPages()
    return serializeDestination(item)
  } catch (error) {
    await image.rollback()
    slugRace(error)
  }
}

export async function updateDestination(id: string, input: DestinationInput, file: File | null) {
  const existing = await findDestination(id)
  // A changed web address breaks old links, so it only changes when the admin types a new one.
  const slug = input.slug && input.slug !== existing.slug ? input.slug : undefined
  if (slug) await assertSlugFree(slug, id)
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: Boolean(input.removeImage) }, "destinations", existing.imageKey)
  try {
    const item = await getPrisma().destination.update({ where: { id }, data: { ...dataFrom(input), ...(slug ? { slug } : {}), ...image.columns } })
    await image.commit()
    refreshPublicPages()
    return { before: serializeDestination(existing), destination: serializeDestination(item) }
  } catch (error) {
    await image.rollback()
    slugRace(error)
  }
}

export async function deleteDestination(id: string) {
  const existing = await findDestination(id)
  await getPrisma().destination.delete({ where: { id } })
  await removeStoredImage(existing.imageKey)
  refreshPublicPages()
  return serializeDestination(existing)
}

const categoryForGroup: Record<BuiltInGroupId, DestinationCategory> = {
  maharashtra: "MAHARASHTRA",
  beyond: "OTHER_STATES",
  pilgrimage: "PILGRIMAGE",
}

/**
 * Copies the destinations the website shows today (both languages, same
 * photos) into the admin panel, so they can be edited from there.
 * Only allowed while there are none, so it can never create duplicates.
 */
export async function importBuiltInDestinations(): Promise<number> {
  const prisma = getPrisma()
  if ((await prisma.destination.count()) > 0) {
    throw new AppError("CONFLICT", "Destinations already exist, so nothing was imported.", 409)
  }
  const en = getDictionary("en").pages.destinations
  const mr = getDictionary("mr").pages.destinations
  const rows: Prisma.DestinationCreateManyInput[] = []
  const slugs = new Set<string>()
  for (const group of builtInDestinationGroups) {
    for (const [index, id] of group.places.entries()) {
      const ref = builtInPlaceImages[id]
      const url = ref ? findNamedImage(ref.category, ref.name) : null
      const size = url ? await bundledImageSize(url).catch(() => null) : null
      const slug = await freeSlug(slugify(en.places[id].name), undefined, slugs)
      slugs.add(slug)
      rows.push({
        slug,
        name: en.places[id].name,
        nameMr: mr.places[id].name,
        state: group.id === "maharashtra" ? "Maharashtra" : null,
        country: "India",
        shortDescription: en.places[id].description,
        shortDescriptionMr: mr.places[id].description,
        category: categoryForGroup[group.id],
        imageUrl: url && size ? url : null,
        imageWidth: size?.width ?? null,
        imageHeight: size?.height ?? null,
        published: true,
        sortOrder: index,
      })
    }
  }
  await prisma.destination.createMany({ data: rows })
  refreshPublicPages()
  return rows.length
}

// ─── Public website ───────────────────────────────────────────

const hasOwnPage = (item: Pick<Destination, "description">) => (item.description?.trim().length ?? 0) >= DESTINATION_PAGE_MIN_DESCRIPTION

export type PublicDestination = {
  id: string
  slug: string
  name: string
  shortDescription: string
  description: string | null
  state: string | null
  category: DestinationCategory
  image: { url: string; width: number; height: number; alt: string } | null
  /** Whether /destinations/[slug] exists for it. */
  hasPage: boolean
  seoTitle: string | null
  seoDescription: string | null
  updatedAt: Date
}

function toPublic(locale: Locale, item: Destination): PublicDestination {
  return {
    id: item.id,
    slug: item.slug,
    name: pick(locale, item.name, item.nameMr),
    shortDescription: pick(locale, item.shortDescription, item.shortDescriptionMr),
    description: pick(locale, item.description, item.descriptionMr),
    state: item.state,
    category: item.category,
    image:
      item.imageUrl && item.imageWidth && item.imageHeight
        ? { url: item.imageUrl, width: item.imageWidth, height: item.imageHeight, alt: item.imageAlt ?? "" }
        : null,
    hasPage: hasOwnPage(item),
    // The SEO fields are written in English; Marathi pages use their own defaults.
    seoTitle: locale === "en" ? item.seoTitle : null,
    seoDescription: locale === "en" ? item.seoDescription : null,
    updatedAt: item.updatedAt,
  }
}

/**
 * Destinations for the website, or null when none are published yet
 * (the site then keeps showing its built-in destinations).
 */
export async function listLiveDestinations(locale: Locale, preview: boolean): Promise<PublicDestination[] | null> {
  try {
    const rows = await getPrisma().destination.findMany({
      where: preview ? {} : { published: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 300,
    })
    if (!rows.length) return null
    return rows.map((item) => toPublic(locale, item))
  } catch (error) {
    logger.error("destinations_read_failed", describeError(error))
    return null
  }
}

/** One destination's page: published (or any, while an admin previews) and with a full write-up. */
export async function getLiveDestination(locale: Locale, slug: string, preview: boolean): Promise<PublicDestination | null> {
  if (!SLUG_PATTERN.test(slug) || slug.length > SLUG_MAX) return null
  const item = await getPrisma().destination.findUnique({ where: { slug } })
  if (!item || (!item.published && !preview) || !hasOwnPage(item)) return null
  return toPublic(locale, item)
}

/** Published destinations that have their own page, for the sitemap. */
export async function listDestinationPages(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    const rows = await getPrisma().destination.findMany({
      where: { published: true, description: { not: null } },
      select: { slug: true, description: true, updatedAt: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 300,
    })
    return rows.filter(hasOwnPage).map(({ slug, updatedAt }) => ({ slug, updatedAt }))
  } catch (error) {
    logger.error("destination_pages_read_failed", describeError(error))
    return []
  }
}
