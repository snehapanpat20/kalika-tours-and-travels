import "server-only"
import { revalidatePath } from "next/cache"
import type { GalleryItem, Prisma, TravelType } from "@/generated/prisma/client"
import { AppError } from "@/lib/errors/app-error"
import { describeError, logger } from "@/server/api/logger"
import { getPrisma } from "@/server/db/prisma"
import { removeStoredImage, resolveImageInput } from "@/server/storage/images"

export const GALLERY_UPLOAD_MAX_BYTES = 12 * 1024 * 1024

const fromDbDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null)
const toDbDate = (iso: string | null | undefined) => (iso ? new Date(`${iso}T00:00:00Z`) : iso === null ? null : undefined)

export function serializeGalleryItem(item: GalleryItem) {
  return {
    id: item.id,
    imageUrl: item.imageUrl,
    width: item.width,
    height: item.height,
    title: item.title,
    altText: item.altText,
    caption: item.caption,
    destination: item.destination,
    tripType: item.tripType,
    tripDate: fromDbDate(item.tripDate),
    featured: item.featured,
    published: item.published,
    sortOrder: item.sortOrder,
    uploaded: Boolean(item.imageKey),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export type SerializedGalleryItem = ReturnType<typeof serializeGalleryItem>
/** What public pages need: no admin-only fields. */
export type PublicGalleryItem = Omit<SerializedGalleryItem, "featured" | "published" | "sortOrder" | "uploaded" | "createdAt" | "updatedAt">

const toPublic = ({ id, imageUrl, width, height, title, altText, caption, destination, tripType, tripDate }: SerializedGalleryItem): PublicGalleryItem => ({
  id,
  imageUrl,
  width,
  height,
  title,
  altText,
  caption,
  destination,
  tripType,
  tripDate,
})

/** Public pages refresh on their next visit after any content change. */
export function refreshPublicPages() {
  revalidatePath("/(site)/[locale]", "layout")
}

const publicOrder: Prisma.GalleryItemOrderByWithRelationInput[] = [{ sortOrder: "asc" }, { tripDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]

/**
 * Published photos for the gallery page (drafts too while an admin previews).
 * Empty (never an error page) if the database is unavailable.
 */
export async function listPublishedGallery(preview = false): Promise<PublicGalleryItem[]> {
  try {
    const rows = await getPrisma().galleryItem.findMany({ where: preview ? {} : { published: true }, orderBy: publicOrder, take: 500 })
    return rows.map(serializeGalleryItem).map(toPublic)
  } catch (error) {
    logger.error("gallery_public_unavailable", describeError(error))
    return []
  }
}

/** Featured published photos for the homepage (featured drafts too while previewing). */
export async function listFeaturedGallery(limit = 6, preview = false): Promise<PublicGalleryItem[]> {
  try {
    const rows = await getPrisma().galleryItem.findMany({ where: preview ? { featured: true } : { published: true, featured: true }, orderBy: publicOrder, take: limit })
    return rows.map(serializeGalleryItem).map(toPublic)
  } catch (error) {
    logger.error("gallery_featured_unavailable", describeError(error))
    return []
  }
}

// ─── Admin ────────────────────────────────────────────────────

export type GalleryListQuery = {
  page: number
  pageSize: number
  search?: string
  visibility?: "published" | "draft"
  featured?: "yes"
  tripType?: TravelType
  sort: "order" | "newest" | "tripDate"
}

export async function adminListGallery(query: GalleryListQuery) {
  const where: Prisma.GalleryItemWhereInput = {}
  if (query.visibility) where.published = query.visibility === "published"
  if (query.featured) where.featured = true
  if (query.tripType) where.tripType = query.tripType
  const search = query.search?.trim()
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { caption: { contains: search, mode: "insensitive" } },
      { destination: { contains: search, mode: "insensitive" } },
    ]
  }
  const orderBy: Prisma.GalleryItemOrderByWithRelationInput[] =
    query.sort === "newest" ? [{ createdAt: "desc" }] : query.sort === "tripDate" ? [{ tripDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] : publicOrder

  const prisma = getPrisma()
  const [total, rows, published] = await prisma.$transaction([
    prisma.galleryItem.count({ where }),
    prisma.galleryItem.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.galleryItem.count({ where: { published: true } }),
  ])
  return {
    items: rows.map(serializeGalleryItem),
    counts: { published },
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  }
}

export type GalleryFields = {
  title: string
  altText: string | null
  caption: string | null
  destination: string | null
  tripType: TravelType | null
  tripDate: string | null
  featured: boolean
  published: boolean
  sortOrder: number
  imagePath: string | null
}

const missingImage = () =>
  new AppError("VALIDATION", "Add a photo: upload an image or choose a website image.", 422, [{ field: "image", message: "Add a photo: upload an image or choose a website image." }])

/** Image for a gallery item: an uploaded file, or a path to an image bundled with the site. */
async function resolveImage(file: File | null, imagePath: string | null) {
  const image = await resolveImageInput({ file, imagePath }, "gallery", { maxBytes: GALLERY_UPLOAD_MAX_BYTES, maxDimension: 2400, field: "image" })
  return image ? { imageUrl: image.url, imageKey: image.key, width: image.width, height: image.height } : null
}

export async function createGalleryItem(fields: GalleryFields, file: File | null) {
  const image = await resolveImage(file, fields.imagePath)
  if (!image) throw missingImage()
  try {
    const item = await getPrisma().galleryItem.create({
      data: {
        ...image,
        title: fields.title,
        altText: fields.altText,
        caption: fields.caption,
        destination: fields.destination,
        tripType: fields.tripType,
        tripDate: toDbDate(fields.tripDate) ?? null,
        featured: fields.featured,
        published: fields.published,
        sortOrder: fields.sortOrder,
      },
    })
    refreshPublicPages()
    return serializeGalleryItem(item)
  } catch (error) {
    await removeStoredImage(image.imageKey) // don't leave an orphaned file
    throw error
  }
}

async function findItem(id: string) {
  const item = await getPrisma().galleryItem.findUnique({ where: { id } })
  if (!item) throw new AppError("NOT_FOUND", "Gallery item not found.", 404)
  return item
}

export async function getGalleryItem(id: string) {
  return serializeGalleryItem(await findItem(id))
}

export async function updateGalleryItem(id: string, fields: Partial<GalleryFields>, file: File | null) {
  const existing = await findItem(id)
  const image = await resolveImage(file, fields.imagePath ?? null)
  try {
    const item = await getPrisma().galleryItem.update({
      where: { id },
      data: {
        ...(image ?? {}),
        title: fields.title,
        altText: fields.altText,
        caption: fields.caption,
        destination: fields.destination,
        tripType: fields.tripType,
        tripDate: toDbDate(fields.tripDate),
        featured: fields.featured,
        published: fields.published,
        sortOrder: fields.sortOrder,
      },
    })
    // The old upload is no longer used once a new image has been saved
    if (image && existing.imageKey && existing.imageKey !== image.imageKey) await removeStoredImage(existing.imageKey)
    refreshPublicPages()
    return serializeGalleryItem(item)
  } catch (error) {
    if (image) await removeStoredImage(image.imageKey)
    throw error
  }
}

/** Deletes the item and its uploaded file. Bundled website images are left in place. */
export async function deleteGalleryItem(id: string) {
  const existing = await findItem(id)
  await getPrisma().galleryItem.delete({ where: { id } })
  await removeStoredImage(existing.imageKey)
  refreshPublicPages()
}

export async function countPublishedPhotos(): Promise<number> {
  return getPrisma().galleryItem.count({ where: { published: true } })
}
