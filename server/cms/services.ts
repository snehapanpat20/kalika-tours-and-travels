import "server-only"
import { z } from "zod"
import type { Prisma, Service, TravelType } from "@/generated/prisma/client"
import { journeyVisuals, serviceOrder } from "@/components/home/home-content"
import { cmsIconNames, type CmsIconName } from "@/lib/cms/icons"
import { findNamedImage } from "@/lib/config/media-file"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { AppError } from "@/lib/errors/app-error"
import { travelTypeByService, travelTypes } from "@/lib/validation/enquiry"
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
import type { ServiceId } from "@/types/catalog"

const serviceShape = z.object({
  title: requiredText(80, "Service title"),
  titleMr: optionalText(80, "Marathi title"),
  shortDescription: requiredText(240, "Short description"),
  shortDescriptionMr: optionalText(240, "Marathi short description"),
  description: optionalText(2000, "Full description", { multiline: true }),
  descriptionMr: optionalText(2000, "Marathi full description", { multiline: true }),
  suitableFor: optionalText(1000, "Suitable for", { multiline: true }),
  suitableForMr: optionalText(1000, "Marathi suitable for", { multiline: true }),
  enquiryType: z.enum(travelTypes, { error: "Choose the trip type for enquiries." }),
  icon: z.enum(cmsIconNames, { error: "Choose an icon." }),
  imageAlt: optionalText(200, "Photo description"),
  published: formBoolean,
  sortOrder: sortOrderField,
  imagePath: imagePathField,
  removeImage: formBoolean,
})

export const serviceCreateSchema = serviceShape.extend({
  icon: z.enum(cmsIconNames, { error: "Choose an icon." }).default("route"),
  published: formBoolean.default(false),
  sortOrder: sortOrderField.default(0),
  removeImage: formBoolean.default(false),
})
export const serviceUpdateSchema = serviceShape.partial()

export type ServiceInput = z.infer<typeof serviceUpdateSchema>

export const serviceListSchema = z.object({
  ...listQueryBase,
  visibility: z.enum(["published", "draft"]).optional(),
})

export function serializeService(item: Service) {
  return {
    id: item.id,
    title: item.title,
    titleMr: item.titleMr,
    shortDescription: item.shortDescription,
    shortDescriptionMr: item.shortDescriptionMr,
    description: item.description,
    descriptionMr: item.descriptionMr,
    suitableFor: item.suitableFor,
    suitableForMr: item.suitableForMr,
    enquiryType: item.enquiryType,
    icon: item.icon,
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

export type AdminService = ReturnType<typeof serializeService>

function dataFrom(input: ServiceInput): Omit<ServiceInput, "imagePath" | "removeImage"> {
  const data = { ...input }
  delete data.imagePath
  delete data.removeImage
  return data
}

export async function adminListServices(query: z.infer<typeof serviceListSchema>) {
  const where: Prisma.ServiceWhereInput = {}
  if (query.visibility) where.published = query.visibility === "published"
  const search = query.search?.trim()
  if (search) where.OR = [{ title: { contains: search, mode: "insensitive" } }, { shortDescription: { contains: search, mode: "insensitive" } }]
  const prisma = getPrisma()
  const [total, rows, all] = await prisma.$transaction([
    prisma.service.count({ where }),
    prisma.service.findMany({ where, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.service.count(),
  ])
  return { ...paginate(rows.map(serializeService), total, query.page, query.pageSize), counts: { all } }
}

async function findService(id: string) {
  const item = await getPrisma().service.findUnique({ where: { id } })
  if (!item) throw notFound("Service")
  return item
}

export async function getService(id: string) {
  return serializeService(await findService(id))
}

export async function createService(input: z.infer<typeof serviceCreateSchema>, file: File | null) {
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: false }, "services", null)
  try {
    const item = await getPrisma().service.create({ data: { ...dataFrom(input), ...image.columns } as Prisma.ServiceCreateInput })
    refreshPublicPages()
    return serializeService(item)
  } catch (error) {
    await image.rollback()
    throw error
  }
}

export async function updateService(id: string, input: ServiceInput, file: File | null) {
  const existing = await findService(id)
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: Boolean(input.removeImage) }, "services", existing.imageKey)
  try {
    const item = await getPrisma().service.update({ where: { id }, data: { ...dataFrom(input), ...image.columns } })
    await image.commit()
    refreshPublicPages()
    return { before: serializeService(existing), service: serializeService(item) }
  } catch (error) {
    await image.rollback()
    throw error
  }
}

export async function deleteService(id: string) {
  const existing = await findService(id)
  await getPrisma().service.delete({ where: { id } })
  await removeStoredImage(existing.imageKey)
  refreshPublicPages()
  return serializeService(existing)
}

const builtInIcons: Record<ServiceId, CmsIconName> = {
  outstation: "route",
  family: "heart",
  group: "users",
  pilgrimage: "landmark",
  corporate: "briefcase",
}

/** Copies the five services the website shows today into the admin panel. Only while there are none. */
export async function importBuiltInServices(): Promise<number> {
  const prisma = getPrisma()
  if ((await prisma.service.count()) > 0) throw new AppError("CONFLICT", "Services already exist, so nothing was imported.", 409)
  const en = getDictionary("en")
  const mr = getDictionary("mr")
  const rows: Prisma.ServiceCreateManyInput[] = []
  for (const [index, id] of serviceOrder.entries()) {
    const ref = journeyVisuals[id]
    const url = findNamedImage(ref.category, ref.name)
    const size = url ? await bundledImageSize(url).catch(() => null) : null
    rows.push({
      title: en.home.services.items[id].title,
      titleMr: mr.home.services.items[id].title,
      shortDescription: en.home.services.items[id].body,
      shortDescriptionMr: mr.home.services.items[id].body,
      suitableFor: en.pages.services.suitable[id].join("\n"),
      suitableForMr: mr.pages.services.suitable[id].join("\n"),
      enquiryType: travelTypeByService[id],
      icon: builtInIcons[id],
      imageUrl: url && size ? url : null,
      imageWidth: size?.width ?? null,
      imageHeight: size?.height ?? null,
      imageAlt: en.home.journeys.items[id].alt,
      published: true,
      sortOrder: index,
    })
  }
  await prisma.service.createMany({ data: rows })
  refreshPublicPages()
  return rows.length
}

// ─── Public website ───────────────────────────────────────────

const serviceIdByType = Object.fromEntries(Object.entries(travelTypeByService).map(([id, type]) => [type, id])) as Record<TravelType, ServiceId>

export type PublicService = {
  id: string
  /** Stable page anchor, from the English title (e.g. "family-tours"). */
  anchor: string
  title: string
  shortDescription: string
  description: string | null
  suitableFor: string[]
  /** The enquiry form's service, for "Plan This Trip". */
  planService: ServiceId
  icon: string
  image: { url: string; width: number; height: number; alt: string } | null
}

const toAnchor = (title: string, id: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || `service-${id.slice(0, 8)}`

/** Services for the website, or null when none are published yet (built-in services stay). */
export async function listLiveServices(locale: Locale, preview: boolean): Promise<PublicService[] | null> {
  try {
    const rows = await getPrisma().service.findMany({ where: preview ? {} : { published: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], take: 50 })
    if (!rows.length) return null
    const seen = new Set<string>()
    return rows.map((item) => {
      let anchor = toAnchor(item.title, item.id)
      if (seen.has(anchor)) anchor = `${anchor}-${item.id.slice(0, 6)}`
      seen.add(anchor)
      const suitable = pick(locale, item.suitableFor, item.suitableForMr)
      return {
        id: item.id,
        anchor,
        title: pick(locale, item.title, item.titleMr),
        shortDescription: pick(locale, item.shortDescription, item.shortDescriptionMr),
        description: pick(locale, item.description, item.descriptionMr),
        suitableFor: suitable ? suitable.split("\n").map((line) => line.trim()).filter(Boolean) : [],
        planService: serviceIdByType[item.enquiryType],
        icon: item.icon,
        image:
          item.imageUrl && item.imageWidth && item.imageHeight
            ? { url: item.imageUrl, width: item.imageWidth, height: item.imageHeight, alt: item.imageAlt ?? "" }
            : null,
      }
    })
  } catch (error) {
    logger.error("services_read_failed", describeError(error))
    return null
  }
}
