import "server-only"
import { z } from "zod"
import type { Offer, Prisma } from "@/generated/prisma/client"
import { resolveLink } from "@/lib/cms/links"
import { scheduleStatus, type ScheduleStatus } from "@/lib/cms/schedule"
import type { Locale } from "@/lib/i18n/locales"
import { describeError, logger } from "@/server/api/logger"
import {
  checkDateOrder,
  formBoolean,
  imagePathField,
  istDateTime,
  linkField,
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
import { removeStoredImage } from "@/server/storage/images"

// ─── Validation ───────────────────────────────────────────────

const offerShape = z.object({
  title: requiredText(120, "Offer title"),
  titleMr: optionalText(120, "Marathi title"),
  shortDescription: requiredText(240, "Short description"),
  shortDescriptionMr: optionalText(240, "Marathi short description"),
  description: optionalText(2000, "Full description", { multiline: true }),
  descriptionMr: optionalText(2000, "Marathi full description", { multiline: true }),
  label: optionalText(40, "Offer label"),
  labelMr: optionalText(40, "Marathi offer label"),
  ctaText: optionalText(40, "Button text"),
  ctaTextMr: optionalText(40, "Marathi button text"),
  ctaLink: linkField,
  imageAlt: optionalText(200, "Photo description"),
  startsAt: istDateTime("Start"),
  endsAt: istDateTime("End"),
  published: formBoolean,
  sortOrder: sortOrderField,
  imagePath: imagePathField,
  removeImage: formBoolean,
})

/** Defaults apply only when creating; an update changes just the fields sent. */
export const offerCreateSchema = offerShape
  .extend({ published: formBoolean.default(false), sortOrder: sortOrderField.default(0), removeImage: formBoolean.default(false) })
  .superRefine(checkDateOrder)
export const offerUpdateSchema = offerShape.partial().superRefine(checkDateOrder)

export type OfferInput = z.infer<typeof offerUpdateSchema>

export const offerListSchema = z.object({
  ...listQueryBase,
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED"]).optional(),
  sort: z.enum(["order", "newest", "startsAt"]).default("order"),
})

// ─── Serialisation ────────────────────────────────────────────

export function serializeOffer(offer: Offer) {
  return {
    id: offer.id,
    title: offer.title,
    titleMr: offer.titleMr,
    shortDescription: offer.shortDescription,
    shortDescriptionMr: offer.shortDescriptionMr,
    description: offer.description,
    descriptionMr: offer.descriptionMr,
    label: offer.label,
    labelMr: offer.labelMr,
    ctaText: offer.ctaText,
    ctaTextMr: offer.ctaTextMr,
    ctaLink: offer.ctaLink,
    imageUrl: offer.imageUrl,
    imageWidth: offer.imageWidth,
    imageHeight: offer.imageHeight,
    imageAlt: offer.imageAlt,
    uploaded: Boolean(offer.imageKey),
    startsAt: offer.startsAt?.toISOString() ?? null,
    endsAt: offer.endsAt?.toISOString() ?? null,
    published: offer.published,
    sortOrder: offer.sortOrder,
    status: scheduleStatus(offer),
    createdAt: offer.createdAt.toISOString(),
    updatedAt: offer.updatedAt.toISOString(),
  }
}

export type AdminOffer = ReturnType<typeof serializeOffer>

/** Where "status" filters land in the database, relative to now. */
function statusWhere(status: ScheduleStatus, now: Date): Prisma.OfferWhereInput {
  const notEnded: Prisma.OfferWhereInput = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
  switch (status) {
    case "EXPIRED":
      return { endsAt: { lte: now } }
    case "DRAFT":
      return { published: false, ...notEnded }
    case "SCHEDULED":
      return { published: true, startsAt: { gt: now }, ...notEnded }
    case "ACTIVE":
      return { published: true, AND: [notEnded, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }] }
  }
}

// ─── Admin ────────────────────────────────────────────────────

export async function adminListOffers(query: z.infer<typeof offerListSchema>) {
  const now = new Date()
  const where: Prisma.OfferWhereInput = query.status ? statusWhere(query.status, now) : {}
  const search = query.search?.trim()
  if (search) {
    where.AND = [
      ...((where.AND as Prisma.OfferWhereInput[] | undefined) ?? []),
      { OR: [{ title: { contains: search, mode: "insensitive" } }, { shortDescription: { contains: search, mode: "insensitive" } }, { label: { contains: search, mode: "insensitive" } }] },
    ]
  }
  const orderBy: Prisma.OfferOrderByWithRelationInput[] =
    query.sort === "newest" ? [{ createdAt: "desc" }] : query.sort === "startsAt" ? [{ startsAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] : [{ sortOrder: "asc" }, { createdAt: "desc" }]

  const prisma = getPrisma()
  const [total, rows, active] = await prisma.$transaction([
    prisma.offer.count({ where }),
    prisma.offer.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.offer.count({ where: statusWhere("ACTIVE", now) }),
  ])
  return { ...paginate(rows.map(serializeOffer), total, query.page, query.pageSize), counts: { active } }
}

async function findOffer(id: string) {
  const offer = await getPrisma().offer.findUnique({ where: { id } })
  if (!offer) throw notFound("Offer")
  return offer
}

export async function getOffer(id: string) {
  return serializeOffer(await findOffer(id))
}

/** Form fields that are instructions about the image, not columns. */
function dataFrom(input: OfferInput): Omit<OfferInput, "imagePath" | "removeImage"> {
  const data = { ...input }
  delete data.imagePath
  delete data.removeImage
  return data
}

export async function createOffer(input: z.infer<typeof offerCreateSchema>, file: File | null) {
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: false }, "offers", null)
  try {
    const offer = await getPrisma().offer.create({ data: { ...dataFrom(input), ...image.columns } as Prisma.OfferCreateInput })
    refreshPublicPages()
    return serializeOffer(offer)
  } catch (error) {
    await image.rollback()
    throw error
  }
}

export async function updateOffer(id: string, input: OfferInput, file: File | null) {
  const existing = await findOffer(id)
  const image = await prepareImageChange({ file, imagePath: input.imagePath ?? null, remove: Boolean(input.removeImage) }, "offers", existing.imageKey)
  try {
    const offer = await getPrisma().offer.update({ where: { id }, data: { ...dataFrom(input), ...image.columns } })
    await image.commit()
    refreshPublicPages()
    return { before: serializeOffer(existing), offer: serializeOffer(offer) }
  } catch (error) {
    await image.rollback()
    throw error
  }
}

export async function deleteOffer(id: string) {
  const existing = await findOffer(id)
  await getPrisma().offer.delete({ where: { id } })
  await removeStoredImage(existing.imageKey)
  refreshPublicPages()
  return serializeOffer(existing)
}

export async function countActiveOffers(): Promise<number> {
  return getPrisma().offer.count({ where: statusWhere("ACTIVE", new Date()) })
}

export async function adminActiveOffers(limit = 4) {
  const rows = await getPrisma().offer.findMany({ where: statusWhere("ACTIVE", new Date()), orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: limit })
  return rows.map(serializeOffer)
}

// ─── Public website ───────────────────────────────────────────

export type PublicOffer = {
  id: string
  title: string
  shortDescription: string
  description: string | null
  label: string | null
  cta: { text: string; href: string; external: boolean } | null
  image: { url: string; width: number; height: number; alt: string } | null
  endsAt: string | null
  /** Only in preview: not live yet (draft or scheduled). */
  preview: boolean
}

/**
 * Offers to show now. In preview an admin also sees drafts and scheduled
 * offers (never expired ones), marked as preview.
 */
export async function listLiveOffers(locale: Locale, preview: boolean, defaultCta: string): Promise<PublicOffer[]> {
  try {
    const now = new Date()
    const where = preview ? { OR: [{ endsAt: null }, { endsAt: { gt: now } }] } : statusWhere("ACTIVE", now)
    const rows = await getPrisma().offer.findMany({ where, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 6 })
    return rows.map((offer) => {
      const link = resolveLink(locale, offer.ctaLink) ?? resolveLink(locale, "page:plan")
      return {
        id: offer.id,
        title: pick(locale, offer.title, offer.titleMr),
        shortDescription: pick(locale, offer.shortDescription, offer.shortDescriptionMr),
        description: pick(locale, offer.description, offer.descriptionMr),
        label: pick(locale, offer.label, offer.labelMr),
        cta: link ? { text: pick(locale, offer.ctaText, offer.ctaTextMr) || defaultCta, ...link } : null,
        image:
          offer.imageUrl && offer.imageWidth && offer.imageHeight
            ? { url: offer.imageUrl, width: offer.imageWidth, height: offer.imageHeight, alt: offer.imageAlt ?? "" }
            : null,
        endsAt: offer.endsAt?.toISOString() ?? null,
        preview: scheduleStatus(offer, now) !== "ACTIVE",
      }
    })
  } catch (error) {
    logger.error("offers_read_failed", describeError(error))
    return []
  }
}

/** How many offers are in each state right now (for the admin tabs). */
export async function countOffersByStatus(): Promise<Record<ScheduleStatus, number> & { ALL: number }> {
  const now = new Date()
  const prisma = getPrisma()
  const [all, draft, scheduled, active, expired] = await prisma.$transaction([
    prisma.offer.count(),
    prisma.offer.count({ where: statusWhere("DRAFT", now) }),
    prisma.offer.count({ where: statusWhere("SCHEDULED", now) }),
    prisma.offer.count({ where: statusWhere("ACTIVE", now) }),
    prisma.offer.count({ where: statusWhere("EXPIRED", now) }),
  ])
  return { ALL: all, DRAFT: draft, SCHEDULED: scheduled, ACTIVE: active, EXPIRED: expired }
}
