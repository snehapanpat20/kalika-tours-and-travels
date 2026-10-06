import "server-only"
import { Prisma, type Enquiry, type EnquiryStatus, type TravelType } from "@/generated/prisma/client"
import { AppError } from "@/lib/errors/app-error"
import type { EnquiryData } from "@/lib/validation/enquiry"
import { getPrisma } from "@/server/db/prisma"

/** Dates in the API are plain calendar days: YYYY-MM-DD. */
const toDbDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10)

/** The public shape of an enquiry in admin responses. */
export function serializeEnquiry(enquiry: Enquiry) {
  return {
    id: enquiry.id,
    fullName: enquiry.fullName,
    phone: enquiry.phone,
    email: enquiry.email,
    travelType: enquiry.travelType,
    destination: enquiry.destination,
    travelDate: fromDbDate(enquiry.travelDate),
    returnDate: fromDbDate(enquiry.returnDate),
    passengerCount: enquiry.passengerCount,
    message: enquiry.message,
    locale: enquiry.locale,
    status: enquiry.status,
    source: enquiry.source,
    notificationStatus: enquiry.notificationStatus,
    notifiedAt: enquiry.notifiedAt?.toISOString() ?? null,
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString(),
  }
}

export type SerializedEnquiry = ReturnType<typeof serializeEnquiry>

/** Window in which an identical submission is treated as a double click. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

/**
 * Stores a validated enquiry. If the same person sent the same trip a moment
 * ago (double click, refresh), the earlier enquiry is returned instead.
 */
export async function createEnquiry(data: EnquiryData): Promise<{ enquiry: Enquiry; duplicate: boolean }> {
  const prisma = getPrisma()

  const existing = await prisma.enquiry.findFirst({
    where: {
      phone: data.phone,
      destination: { equals: data.destination, mode: "insensitive" },
      travelDate: toDbDate(data.travelDate),
      returnDate: toDbDate(data.returnDate),
      deletedAt: null,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return { enquiry: existing, duplicate: true }

  const enquiry = await prisma.enquiry.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      travelType: data.travelType,
      destination: data.destination,
      travelDate: toDbDate(data.travelDate),
      returnDate: toDbDate(data.returnDate),
      passengerCount: data.passengerCount,
      message: data.message,
      locale: data.locale,
      source: "WEBSITE",
    },
  })
  return { enquiry, duplicate: false }
}

export async function markNotification(id: string, status: "SENT" | "FAILED" | "SKIPPED") {
  await getPrisma().enquiry.update({
    where: { id },
    data: { notificationStatus: status, notifiedAt: status === "SENT" ? new Date() : null },
  })
}

// ─── Admin ────────────────────────────────────────────────────

export type ListEnquiriesQuery = {
  page: number
  pageSize: number
  status?: EnquiryStatus
  travelType?: TravelType
  /** Inclusive, by date received (YYYY-MM-DD, India time). */
  from?: string
  to?: string
  /** Inclusive, by travel date (YYYY-MM-DD). */
  travelFrom?: string
  travelTo?: string
  search?: string
  sort: "newest" | "oldest" | "travelDate"
}

/** Start of a calendar day in India (UTC+05:30), as an instant. */
const startOfIndianDay = (iso: string) => new Date(`${iso}T00:00:00+05:30`)

function buildWhere(query: Omit<ListEnquiriesQuery, "page" | "pageSize" | "sort">): Prisma.EnquiryWhereInput {
  const where: Prisma.EnquiryWhereInput = { deletedAt: null }
  if (query.status) where.status = query.status
  if (query.travelType) where.travelType = query.travelType

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: startOfIndianDay(query.from) } : {}),
      // "to" includes the whole day
      ...(query.to ? { lt: new Date(startOfIndianDay(query.to).getTime() + 24 * 60 * 60 * 1000) } : {}),
    }
  }

  if (query.travelFrom || query.travelTo) {
    // travelDate is a calendar date (no time), stored at midnight UTC
    where.travelDate = {
      ...(query.travelFrom ? { gte: new Date(`${query.travelFrom}T00:00:00Z`) } : {}),
      ...(query.travelTo ? { lte: new Date(`${query.travelTo}T00:00:00Z`) } : {}),
    }
  }

  const search = query.search?.trim()
  if (search) {
    const digits = search.replace(/\D/g, "")
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { destination: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      // Phone numbers match on digits, so "98765 43210" finds +919876543210
      ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
    ]
  }
  return where
}

export async function listEnquiries(query: ListEnquiriesQuery) {
  const prisma = getPrisma()
  const where = buildWhere(query)
  const orderBy: Prisma.EnquiryOrderByWithRelationInput[] =
    query.sort === "oldest"
      ? [{ createdAt: "asc" }]
      : query.sort === "travelDate"
        ? [{ travelDate: "asc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }]

  const [total, rows] = await prisma.$transaction([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ])

  return {
    enquiries: rows.map(serializeEnquiry),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

async function findActive(id: string): Promise<Enquiry> {
  const enquiry = await getPrisma().enquiry.findFirst({ where: { id, deletedAt: null } })
  if (!enquiry) throw new AppError("NOT_FOUND", "Enquiry not found.", 404)
  return enquiry
}

export async function getEnquiry(id: string) {
  return serializeEnquiry(await findActive(id))
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  const previous = await findActive(id)
  const updated = await getPrisma().enquiry.update({ where: { id }, data: { status } })
  return { enquiry: serializeEnquiry(updated), previousStatus: previous.status }
}

/** Soft delete: the record is hidden from the admin API but kept in the database. */
export async function softDeleteEnquiry(id: string) {
  const enquiry = await findActive(id)
  await getPrisma().enquiry.update({ where: { id }, data: { deletedAt: new Date() } })
  return { fullName: enquiry.fullName, destination: enquiry.destination }
}

export async function getDashboardStats() {
  const prisma = getPrisma()
  const [groups, recent] = await prisma.$transaction([
    prisma.enquiry.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.enquiry.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }),
  ])

  const counts = Object.fromEntries(groups.map((group) => [group.status, (group._count as { _all: number })._all])) as Partial<
    Record<EnquiryStatus, number>
  >
  const count = (status: EnquiryStatus) => counts[status] ?? 0

  return {
    totalEnquiries: Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0),
    newEnquiries: count("NEW"),
    contactedEnquiries: count("CONTACTED"),
    confirmedEnquiries: count("CONFIRMED"),
    completedEnquiries: count("COMPLETED"),
    cancelledEnquiries: count("CANCELLED"),
    recentEnquiries: recent.map(serializeEnquiry),
  }
}

/** Number of enquiries still waiting for first contact (for the admin header bell). */
export async function countNewEnquiries(): Promise<number> {
  return getPrisma().enquiry.count({ where: { status: "NEW", deletedAt: null } })
}

/** Trips coming up soon that are still open (not completed or cancelled), soonest first. */
export async function listUpcomingTrips(days = 30, limit = 6) {
  // Calendar dates in India time
  const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  const rows = await getPrisma().enquiry.findMany({
    where: { deletedAt: null, status: { in: ["NEW", "CONTACTED", "CONFIRMED"] }, travelDate: { gte: start, lte: end } },
    orderBy: [{ travelDate: "asc" }, { createdAt: "asc" }],
    take: limit,
  })
  return rows.map(serializeEnquiry)
}
