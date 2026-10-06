import "server-only"
import { z } from "zod"
import type { Announcement, AnnouncementType, Prisma } from "@/generated/prisma/client"
import { resolveLink } from "@/lib/cms/links"
import { scheduleStatus, type ScheduleStatus } from "@/lib/cms/schedule"
import type { Locale } from "@/lib/i18n/locales"
import { describeError, logger } from "@/server/api/logger"
import { checkDateOrder, istDateTime, linkField, listQueryBase, notFound, optionalText, paginate, pick, requiredText } from "@/server/cms/entity-helpers"
import { refreshPublicPages } from "@/server/content/gallery"
import { getPrisma } from "@/server/db/prisma"

export const announcementTypes = ["INFO", "OFFER", "IMPORTANT", "FESTIVE"] as const satisfies readonly AnnouncementType[]

const announcementShape = z.object({
  message: requiredText(200, "Message"),
  messageMr: optionalText(200, "Marathi message"),
  ctaText: optionalText(40, "Link text"),
  ctaTextMr: optionalText(40, "Marathi link text"),
  ctaLink: linkField,
  type: z.enum(announcementTypes, { error: "Choose a type." }),
  startsAt: istDateTime("Start"),
  endsAt: istDateTime("End"),
  published: z.boolean(),
})

export const announcementCreateSchema = announcementShape
  .extend({ type: z.enum(announcementTypes, { error: "Choose a type." }).default("INFO"), published: z.boolean().default(false) })
  .superRefine(checkDateOrder)
export const announcementUpdateSchema = announcementShape.partial().superRefine(checkDateOrder)

export const announcementListSchema = z.object({
  ...listQueryBase,
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED"]).optional(),
})

export function serializeAnnouncement(item: Announcement) {
  return {
    id: item.id,
    message: item.message,
    messageMr: item.messageMr,
    ctaText: item.ctaText,
    ctaTextMr: item.ctaTextMr,
    ctaLink: item.ctaLink,
    type: item.type,
    startsAt: item.startsAt?.toISOString() ?? null,
    endsAt: item.endsAt?.toISOString() ?? null,
    published: item.published,
    status: scheduleStatus(item),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export type AdminAnnouncement = ReturnType<typeof serializeAnnouncement>

function statusWhere(status: ScheduleStatus, now: Date): Prisma.AnnouncementWhereInput {
  const notEnded: Prisma.AnnouncementWhereInput = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
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

export async function adminListAnnouncements(query: z.infer<typeof announcementListSchema>) {
  const now = new Date()
  const where: Prisma.AnnouncementWhereInput = query.status ? statusWhere(query.status, now) : {}
  const search = query.search?.trim()
  if (search) where.AND = [...((where.AND as Prisma.AnnouncementWhereInput[] | undefined) ?? []), { message: { contains: search, mode: "insensitive" } }]
  const prisma = getPrisma()
  const [total, rows] = await prisma.$transaction([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({ where, orderBy: [{ createdAt: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ])
  return paginate(rows.map(serializeAnnouncement), total, query.page, query.pageSize)
}

async function findAnnouncement(id: string) {
  const item = await getPrisma().announcement.findUnique({ where: { id } })
  if (!item) throw notFound("Announcement")
  return item
}

export async function getAnnouncement(id: string) {
  return serializeAnnouncement(await findAnnouncement(id))
}

export async function createAnnouncement(input: z.infer<typeof announcementCreateSchema>) {
  const item = await getPrisma().announcement.create({ data: input })
  refreshPublicPages()
  return serializeAnnouncement(item)
}

export async function updateAnnouncement(id: string, input: z.infer<typeof announcementUpdateSchema>) {
  const existing = await findAnnouncement(id)
  const item = await getPrisma().announcement.update({ where: { id }, data: input })
  refreshPublicPages()
  return { before: serializeAnnouncement(existing), announcement: serializeAnnouncement(item) }
}

export async function deleteAnnouncement(id: string) {
  const existing = await findAnnouncement(id)
  await getPrisma().announcement.delete({ where: { id } })
  refreshPublicPages()
  return serializeAnnouncement(existing)
}

export type PublicAnnouncement = {
  id: string
  message: string
  type: AnnouncementType
  cta: { text: string; href: string; external: boolean } | null
  preview: boolean
  /** Changes when the text changes, so a visitor who closed the bar sees a new message. */
  version: string
}

/**
 * The one announcement shown in the bar: the most recently started active one.
 * In preview, the newest not-ended one (draft or scheduled included) is shown.
 */
export async function getLiveAnnouncement(locale: Locale, preview: boolean, defaultCta: string): Promise<PublicAnnouncement | null> {
  try {
    const now = new Date()
    const where = preview ? { OR: [{ endsAt: null }, { endsAt: { gt: now } }] } : statusWhere("ACTIVE", now)
    const item = await getPrisma().announcement.findFirst({
      where,
      orderBy: preview ? [{ updatedAt: "desc" }] : [{ startsAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    })
    if (!item) return null
    const link = resolveLink(locale, item.ctaLink)
    return {
      id: item.id,
      message: pick(locale, item.message, item.messageMr),
      type: item.type,
      cta: link ? { text: pick(locale, item.ctaText, item.ctaTextMr) || defaultCta, ...link } : null,
      preview: scheduleStatus(item, now) !== "ACTIVE",
      version: `${item.id}:${item.updatedAt.getTime()}`,
    }
  } catch (error) {
    logger.error("announcement_read_failed", describeError(error))
    return null
  }
}

/** How many announcements are in each state right now (for the admin tabs). */
export async function countAnnouncementsByStatus(): Promise<Record<ScheduleStatus, number> & { ALL: number }> {
  const now = new Date()
  const prisma = getPrisma()
  const [all, draft, scheduled, active, expired] = await prisma.$transaction([
    prisma.announcement.count(),
    prisma.announcement.count({ where: statusWhere("DRAFT", now) }),
    prisma.announcement.count({ where: statusWhere("SCHEDULED", now) }),
    prisma.announcement.count({ where: statusWhere("ACTIVE", now) }),
    prisma.announcement.count({ where: statusWhere("EXPIRED", now) }),
  ])
  return { ALL: all, DRAFT: draft, SCHEDULED: scheduled, ACTIVE: active, EXPIRED: expired }
}
