import "server-only"
import { z } from "zod"
import type { Destination, DestinationCategory, Prisma } from "@/generated/prisma/client"
import { builtInDestinationGroups, builtInPlaceImages, type BuiltInGroupId } from "@/components/pages/destination-groups"
import { findNamedImage } from "@/lib/config/media-file"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { AppError } from "@/lib/errors/app-error"
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
    uploaded: Boolean(item.imageKey),
    published: item.published,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export type AdminDestination = ReturnType<typeof serializeDestination>

function dataFrom(input: DestinationInput): Omit<DestinationInput, "imagePath" | "removeImage"> {
  const data = { ...input }
  delete data.imagePath
  delete data.removeImage
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
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: false }, "destinations", null)
  try {
    const item = await getPrisma().destination.create({ data: { ...dataFrom(input), ...image.columns } as Prisma.DestinationCreateInput })
    refreshPublicPages()
    return serializeDestination(item)
  } catch (error) {
    await image.rollback()
    throw error
  }
}

export async function updateDestination(id: string, input: DestinationInput, file: File | null) {
  const existing = await findDestination(id)
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: Boolean(input.removeImage) }, "destinations", existing.imageKey)
  try {
    const item = await getPrisma().destination.update({ where: { id }, data: { ...dataFrom(input), ...image.columns } })
    await image.commit()
    refreshPublicPages()
    return { before: serializeDestination(existing), destination: serializeDestination(item) }
  } catch (error) {
    await image.rollback()
    throw error
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
  for (const group of builtInDestinationGroups) {
    for (const [index, id] of group.places.entries()) {
      const ref = builtInPlaceImages[id]
      const url = ref ? findNamedImage(ref.category, ref.name) : null
      const size = url ? await bundledImageSize(url).catch(() => null) : null
      rows.push({
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

export type PublicDestination = {
  id: string
  name: string
  shortDescription: string
  description: string | null
  state: string | null
  category: DestinationCategory
  image: { url: string; width: number; height: number; alt: string } | null
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
    return rows.map((item) => ({
      id: item.id,
      name: pick(locale, item.name, item.nameMr),
      shortDescription: pick(locale, item.shortDescription, item.shortDescriptionMr),
      description: pick(locale, item.description, item.descriptionMr),
      state: item.state,
      category: item.category,
      image:
        item.imageUrl && item.imageWidth && item.imageHeight
          ? { url: item.imageUrl, width: item.imageWidth, height: item.imageHeight, alt: item.imageAlt ?? "" }
          : null,
    }))
  } catch (error) {
    logger.error("destinations_read_failed", describeError(error))
    return null
  }
}
