import "server-only"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { isIsoDate } from "@/lib/validation/enquiry"
import { listQueryBase, paginate } from "@/server/cms/entity-helpers"
import { getPrisma } from "@/server/db/prisma"

export const auditEntityTypes = ["Enquiry", "GalleryItem", "Review", "Offer", "Announcement", "SiteContent", "Destination", "Service", "Admin"] as const

const day = z.string().trim().refine(isIsoDate, { error: "Use a YYYY-MM-DD date." }).optional()

export const auditListSchema = z.object({
  ...listQueryBase,
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  entityType: z.enum(auditEntityTypes).optional(),
  action: z.string().trim().regex(/^[a-z_]{1,40}$/).optional(),
  actorId: z.uuid().optional(),
  from: day,
  to: day,
})

/** Dates are whole days in India time. */
const istDayStart = (iso: string) => new Date(`${iso}T00:00:00+05:30`)

export async function listAuditLogs(query: z.infer<typeof auditListSchema>) {
  const where: Prisma.AuditLogWhereInput = {}
  if (query.entityType) where.entityType = query.entityType
  if (query.action) where.action = query.action
  if (query.actorId) where.actorId = query.actorId
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: istDayStart(query.from) } : {}),
      ...(query.to ? { lt: new Date(istDayStart(query.to).getTime() + 24 * 60 * 60 * 1000) } : {}),
    }
  }
  const search = query.search?.trim()
  if (search) where.OR = [{ summary: { contains: search, mode: "insensitive" } }, { actorName: { contains: search, mode: "insensitive" } }]

  const prisma = getPrisma()
  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ])
  return paginate(
    rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorName: row.actorName,
      actorRole: row.actorRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    query.page,
    query.pageSize,
  )
}

export type AuditLogRow = Awaited<ReturnType<typeof listAuditLogs>>["items"][number]
