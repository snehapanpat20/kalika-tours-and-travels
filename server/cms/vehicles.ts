import "server-only"
import { z } from "zod"
import type { Prisma, Vehicle, VehicleAc, VehicleCategory, VehiclePhoto } from "@/generated/prisma/client"
import { builtInFleet, websiteVehicleKeys, type AcOption, type Vehicle as BuiltInVehicle } from "@/data/fleet"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { AppError } from "@/lib/errors/app-error"
import { describeError, logger } from "@/server/api/logger"
import { IMAGE_MAX_BYTES, formBoolean, listQueryBase, notFound, optionalText, paginate, pick, requiredText, sortOrderField } from "@/server/cms/entity-helpers"
import { refreshPublicPages } from "@/server/content/gallery"
import { getPrisma } from "@/server/db/prisma"
import { bundledImageSize, removeStoredImage, resolveImageInput } from "@/server/storage/images"

/**
 * The fleet: vehicles and their photos, managed in Admin › Fleet and shown on
 * the Our Fleet page. Until any vehicle has been added or imported here, the
 * page keeps showing the built-in list in data/fleet.ts.
 *
 * Enquiries never point at a vehicle (the chosen vehicle is written into the
 * enquiry message), so editing or deleting one cannot change an enquiry.
 */

export const vehicleCategories = ["TRAVELLER", "BUS", "SLEEPER_BUS", "CAR"] as const satisfies readonly VehicleCategory[]
export const vehicleAcOptions = ["AC", "NON_AC", "BOTH"] as const satisfies readonly VehicleAc[]

/** Most photos one vehicle may have. */
export const VEHICLE_PHOTO_LIMIT = 12

// ─── Validation ───────────────────────────────────────────────

/** Empty means "not confirmed yet". */
const capacityField = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value, ctx) => {
    if (value === null || value === undefined || value === "") return null
    const number = typeof value === "number" ? value : Number(value)
    if (!Number.isInteger(number) || number < 1 || number > 99) {
      ctx.addIssue({ code: "custom", message: "Seats must be a whole number from 1 to 99, or left empty until confirmed." })
      return z.NEVER
    }
    return number
  })

const acField = z
  .union([z.enum(vehicleAcOptions, { error: "Choose AC, Non-AC or AC / Non-AC." }), z.literal("")])
  .nullish()
  .transform((value) => value || null)

const vehicleShape = z.object({
  name: requiredText(80, "Vehicle name"),
  nameMr: optionalText(80, "Marathi name"),
  capacity: capacityField,
  ac: acField,
  category: z.enum(vehicleCategories, { error: "Choose the kind of vehicle." }),
  pushBackSeats: formBoolean,
  seatingType: optionalText(120, "Seating detail"),
  seatingTypeMr: optionalText(120, "Marathi seating detail"),
  description: optionalText(600, "Description", { multiline: true }),
  descriptionMr: optionalText(600, "Marathi description", { multiline: true }),
  published: formBoolean,
  sortOrder: sortOrderField,
})

export const vehicleCreateSchema = vehicleShape.extend({
  pushBackSeats: formBoolean.default(false),
  published: formBoolean.default(false),
  sortOrder: sortOrderField.optional(),
})
export const vehicleUpdateSchema = vehicleShape.partial()
export type VehicleInput = z.infer<typeof vehicleUpdateSchema>

export const vehicleListSchema = z.object({
  ...listQueryBase,
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
  visibility: z.enum(["published", "draft"]).optional(),
  category: z.enum(vehicleCategories).optional(),
})

/** New order of the vehicles: every vehicle id, once each, first to last. */
export const vehicleOrderSchema = z.object({
  ids: z.array(z.uuid({ error: "Unknown vehicle." })).min(1).max(200),
})

export const photoAddSchema = z.object({
  imagePath: z
    .string()
    .trim()
    .nullish()
    .transform((value) => value || null),
  alt: optionalText(200, "Photo description"),
  altMr: optionalText(200, "Marathi photo description"),
})

export const photoUpdateSchema = z.object({
  alt: optionalText(200, "Photo description"),
  altMr: optionalText(200, "Marathi photo description"),
})

/** New photo order (every photo id once) and which one is the cover. */
export const photoArrangeSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(VEHICLE_PHOTO_LIMIT),
  coverId: z.uuid({ error: "Choose the cover photo." }),
})

// ─── Admin view ───────────────────────────────────────────────

function serializePhoto(photo: VehiclePhoto) {
  return {
    id: photo.id,
    url: photo.url,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    altMr: photo.altMr,
    isCover: photo.isCover,
    uploaded: Boolean(photo.key),
    sortOrder: photo.sortOrder,
  }
}

export function serializeVehicle(item: Vehicle & { photos: VehiclePhoto[] }) {
  const photos = [...item.photos].sort((a, b) => a.sortOrder - b.sortOrder).map(serializePhoto)
  return {
    id: item.id,
    key: item.key,
    name: item.name,
    nameMr: item.nameMr,
    capacity: item.capacity,
    ac: item.ac,
    category: item.category,
    pushBackSeats: item.pushBackSeats,
    seatingType: item.seatingType,
    seatingTypeMr: item.seatingTypeMr,
    description: item.description,
    descriptionMr: item.descriptionMr,
    published: item.published,
    sortOrder: item.sortOrder,
    photos,
    coverUrl: (photos.find((photo) => photo.isCover) ?? photos[0])?.url ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export type AdminVehicle = ReturnType<typeof serializeVehicle>

const withPhotos = { photos: { orderBy: { sortOrder: "asc" } } } satisfies Prisma.VehicleInclude
const adminOrder: Prisma.VehicleOrderByWithRelationInput[] = [{ sortOrder: "asc" }, { createdAt: "asc" }]

export async function adminListVehicles(query: z.infer<typeof vehicleListSchema>) {
  const where: Prisma.VehicleWhereInput = {}
  if (query.visibility) where.published = query.visibility === "published"
  if (query.category) where.category = query.category
  const search = query.search?.trim()
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { nameMr: { contains: search, mode: "insensitive" } }]
  const prisma = getPrisma()
  const [total, rows, all] = await prisma.$transaction([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({ where, include: withPhotos, orderBy: adminOrder, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.vehicle.count(),
  ])
  return { ...paginate(rows.map(serializeVehicle), total, query.page, query.pageSize), counts: { all } }
}

async function findVehicle(id: string) {
  const item = await getPrisma().vehicle.findUnique({ where: { id }, include: withPhotos })
  if (!item) throw notFound("Vehicle")
  return item
}

export async function getVehicle(id: string) {
  return serializeVehicle(await findVehicle(id))
}

export async function createVehicle(input: z.infer<typeof vehicleCreateSchema>) {
  const prisma = getPrisma()
  // New vehicles go to the end unless an order was given
  const sortOrder = input.sortOrder ?? ((await prisma.vehicle.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1
  const item = await prisma.vehicle.create({ data: { ...input, sortOrder }, include: withPhotos })
  refreshPublicPages()
  return serializeVehicle(item)
}

export async function updateVehicle(id: string, input: VehicleInput) {
  const existing = await findVehicle(id)
  const item = await getPrisma().vehicle.update({ where: { id }, data: input, include: withPhotos })
  refreshPublicPages()
  return { before: serializeVehicle(existing), vehicle: serializeVehicle(item) }
}

/** Deletes the vehicle and its photos; uploaded photo files are removed after the database change. */
export async function deleteVehicle(id: string) {
  const existing = await findVehicle(id)
  await getPrisma().vehicle.delete({ where: { id } })
  await removeFiles(existing.photos.map((photo) => photo.key))
  refreshPublicPages()
  return serializeVehicle(existing)
}

async function removeFiles(keys: (string | null)[]) {
  for (const key of keys) {
    // A file left behind is harmless; a failed delete must not undo the database change
    await removeStoredImage(key).catch((error) => logger.warn("fleet_photo_cleanup_failed", { error: describeError(error) }))
  }
}

/** Saves a new order for all vehicles in one transaction. */
export async function reorderVehicles(ids: string[]) {
  const prisma = getPrisma()
  const existing = await prisma.vehicle.findMany({ select: { id: true } })
  const known = new Set(existing.map((row) => row.id))
  if (new Set(ids).size !== ids.length || ids.length !== known.size || ids.some((id) => !known.has(id))) {
    throw new AppError("VALIDATION", "The vehicle list changed. Reload the page and try again.", 409)
  }
  await prisma.$transaction(ids.map((id, index) => prisma.vehicle.update({ where: { id }, data: { sortOrder: index } })))
  refreshPublicPages()
  return ids.length
}

// ─── Photos ───────────────────────────────────────────────────

const photoOptions = { maxBytes: IMAGE_MAX_BYTES, maxDimension: 2400, field: "image" }

/** Adds one photo (an upload, or a photo already on the website). The first photo becomes the cover. */
export async function addVehiclePhoto(vehicleId: string, input: z.infer<typeof photoAddSchema>, file: File | null) {
  const vehicle = await findVehicle(vehicleId)
  if (vehicle.photos.length >= VEHICLE_PHOTO_LIMIT) {
    throw new AppError("VALIDATION", `A vehicle can have up to ${VEHICLE_PHOTO_LIMIT} photos. Remove one first.`, 422, [
      { field: "image", message: `Up to ${VEHICLE_PHOTO_LIMIT} photos per vehicle.` },
    ])
  }
  const image = await resolveImageInput({ file, imagePath: input.imagePath }, "fleet", photoOptions)
  if (!image) throw new AppError("VALIDATION", "Choose a photo to add.", 422, [{ field: "image", message: "Choose a photo to add." }])
  try {
    await getPrisma().vehiclePhoto.create({
      data: {
        vehicleId,
        url: image.url,
        key: image.key,
        width: image.width,
        height: image.height,
        alt: input.alt,
        altMr: input.altMr,
        isCover: vehicle.photos.length === 0,
        sortOrder: (vehicle.photos.at(-1)?.sortOrder ?? -1) + 1,
      },
    })
  } catch (error) {
    // The file was stored but its record was not: remove the file, log the stage
    logger.error("vehicle_photo_save_failed", { stage: "metadata_persistence", error: describeError(error).name, code: (error as { code?: unknown }).code })
    await removeFiles([image.key])
    throw error
  }
  refreshPublicPages()
  return getVehicle(vehicleId)
}

async function findPhoto(vehicleId: string, photoId: string) {
  const photo = await getPrisma().vehiclePhoto.findFirst({ where: { id: photoId, vehicleId } })
  if (!photo) throw notFound("Photo")
  return photo
}

/** Replaces a photo's image (keeping its place and cover status) and/or its description. */
export async function updateVehiclePhoto(vehicleId: string, photoId: string, input: z.infer<typeof photoUpdateSchema> & { imagePath?: string | null }, file: File | null) {
  const photo = await findPhoto(vehicleId, photoId)
  const image = file || input.imagePath ? await resolveImageInput({ file, imagePath: input.imagePath ?? null }, "fleet", photoOptions) : null
  try {
    await getPrisma().vehiclePhoto.update({
      where: { id: photoId },
      data: {
        alt: input.alt,
        altMr: input.altMr,
        ...(image ? { url: image.url, key: image.key, width: image.width, height: image.height } : {}),
      },
    })
  } catch (error) {
    if (image) await removeFiles([image.key])
    throw error
  }
  // The replaced upload is removed only once the new one is saved
  if (image && photo.key && photo.key !== image.key) await removeFiles([photo.key])
  refreshPublicPages()
  return getVehicle(vehicleId)
}

export async function deleteVehiclePhoto(vehicleId: string, photoId: string) {
  const photo = await findPhoto(vehicleId, photoId)
  const prisma = getPrisma()
  await prisma.$transaction(async (tx) => {
    await tx.vehiclePhoto.delete({ where: { id: photoId } })
    // Removing the cover makes the next photo the cover
    if (photo.isCover) {
      const next = await tx.vehiclePhoto.findFirst({ where: { vehicleId }, orderBy: { sortOrder: "asc" } })
      if (next) await tx.vehiclePhoto.update({ where: { id: next.id }, data: { isCover: true } })
    }
  })
  await removeFiles([photo.key])
  refreshPublicPages()
  return getVehicle(vehicleId)
}

/** Saves the photo order and the cover in one transaction. */
export async function arrangeVehiclePhotos(vehicleId: string, input: z.infer<typeof photoArrangeSchema>) {
  const vehicle = await findVehicle(vehicleId)
  const known = new Set(vehicle.photos.map((photo) => photo.id))
  if (new Set(input.ids).size !== input.ids.length || input.ids.length !== known.size || input.ids.some((id) => !known.has(id)) || !known.has(input.coverId)) {
    throw new AppError("VALIDATION", "The photos changed. Reload the page and try again.", 409)
  }
  const prisma = getPrisma()
  await prisma.$transaction(input.ids.map((id, index) => prisma.vehiclePhoto.update({ where: { id }, data: { sortOrder: index, isCover: id === input.coverId } })))
  refreshPublicPages()
  return getVehicle(vehicleId)
}

// ─── Import the website's vehicles ────────────────────────────

const categoryOf = (vehicle: BuiltInVehicle): VehicleCategory =>
  vehicle.categories.includes("car") ? "CAR" : vehicle.categories.includes("sleeper") ? "SLEEPER_BUS" : vehicle.categories.includes("traveller") ? "TRAVELLER" : "BUS"

const acOf = (options: AcOption[]): VehicleAc | null => (options.length === 2 ? "BOTH" : options[0] === "ac" ? "AC" : options[0] === "nonAc" ? "NON_AC" : null)

/**
 * Copies the starting list (data/fleet.ts: the 20 seater Traveller, the Ertiga
 * and the Innova Crysta, with their photos) into Admin › Fleet, published.
 * Vehicles are matched by their stable key, so running it again adds only
 * what is missing; it never changes or removes an existing vehicle.
 */
export async function importBuiltInVehicles(): Promise<number> {
  const prisma = getPrisma()
  const en = getDictionary("en").fleet
  const mr = getDictionary("mr").fleet
  const existingKeys = new Set((await prisma.vehicle.findMany({ where: { key: { not: null } }, select: { key: true } })).map((row) => row.key))
  let next = ((await prisma.vehicle.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1
  let added = 0

  const rows: { key: string; data: Omit<Prisma.VehicleCreateInput, "key">; photos: { src: string; position?: string; alt: string; altMr: string }[] }[] = builtInFleet.map((vehicle) => ({
    key: vehicle.id,
    data: {
      name: en.vehicles[vehicle.id].name,
      nameMr: mr.vehicles[vehicle.id].name,
      capacity: vehicle.capacity,
      ac: acOf(vehicle.acOptions),
      category: categoryOf(vehicle),
      pushBackSeats: Boolean(vehicle.pushBackOption),
      description: en.vehicles[vehicle.id].description,
      descriptionMr: mr.vehicles[vehicle.id].description,
      published: true,
    },
    photos: [vehicle.exterior, ...vehicle.interior].flatMap((photo) => (photo ? [{ src: photo.src, alt: en.photos[photo.id].alt, altMr: mr.photos[photo.id].alt }] : [])),
  }))

  for (const row of rows) {
    if (existingKeys.has(row.key)) continue
    const photos = []
    for (const [index, photo] of row.photos.entries()) {
      const size = await bundledImageSize(photo.src).catch(() => null)
      if (size) photos.push({ url: photo.src, key: null, width: size.width, height: size.height, alt: photo.alt, altMr: photo.altMr, isCover: index === 0, sortOrder: index })
    }
    await prisma.vehicle.create({ data: { ...row.data, key: row.key, sortOrder: next++, photos: { create: photos } } })
    added++
  }
  if (added) refreshPublicPages()
  return added
}

// ─── Public website ───────────────────────────────────────────

export type PublicVehicle = {
  id: string
  key: string | null
  name: string
  /** The English name, for the business (e.g. the trip form's "[Vehicle: …]" note). */
  englishName: string
  description: string | null
  capacity: number | null
  ac: VehicleAc | null
  category: VehicleCategory
  pushBackSeats: boolean
  seatingType: string | null
  photos: { id: string; src: string; alt: string }[]
}

/**
 * The website's only source of vehicles: the published ones in Admin › Fleet
 * that are one of the three listed vehicles (data/fleet.ts websiteVehicleKeys:
 * the 20-Seater Traveller, Ertiga and Innova Crysta), in order, in the
 * visitor's language. While an admin previews, drafts of those three too.
 * Used by the homepage, the Our Fleet page, the trip form and the FAQ.
 * An empty list means none are published; null means the database could not
 * be read, and the pages then say so instead of showing an old list.
 * Only public fields leave here.
 */
export async function listPublicVehicles(locale: Locale, preview: boolean): Promise<PublicVehicle[] | null> {
  try {
    const prisma = getPrisma()
    const rows = await prisma.vehicle.findMany({
      where: { key: { in: [...websiteVehicleKeys] }, ...(preview ? {} : { published: true }) },
      include: withPhotos,
      orderBy: adminOrder,
    })
    return rows.map((item) => {
      const name = pick(locale, item.name, item.nameMr)
      const photos = [...item.photos].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder)
      return {
        id: item.id,
        key: item.key,
        name,
        englishName: item.name,
        description: pick(locale, item.description, item.descriptionMr),
        capacity: item.capacity,
        ac: item.ac,
        category: item.category,
        pushBackSeats: item.pushBackSeats,
        seatingType: pick(locale, item.seatingType, item.seatingTypeMr),
        photos: photos.map((photo) => ({ id: photo.id, src: photo.url, alt: pick(locale, photo.alt, photo.altMr) ?? name })),
      }
    })
  } catch (error) {
    // Never fall back to a built-in list: it would bring back deleted vehicles
    logger.error("fleet_list_failed", { error: describeError(error) })
    return null
  }
}
