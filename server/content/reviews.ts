import "server-only"
import type { Prisma, Review, ReviewStatus, TravelType } from "@/generated/prisma/client"
import { AppError } from "@/lib/errors/app-error"
import { REVIEW_PHOTO_MAX_BYTES, type ReviewData } from "@/lib/validation/review"
import { describeError, logger } from "@/server/api/logger"
import { refreshPublicPages } from "@/server/content/gallery"
import { getPrisma } from "@/server/db/prisma"
import { removeStoredImage, storeImageUpload } from "@/server/storage/images"

export function serializeReview(review: Review) {
  return {
    id: review.id,
    customerName: review.customerName,
    rating: review.rating,
    reviewText: review.reviewText,
    destination: review.destination,
    tripType: review.tripType,
    photoUrl: review.photoUrl,
    photoWidth: review.photoWidth,
    photoHeight: review.photoHeight,
    locale: review.locale,
    status: review.status,
    moderatedAt: review.moderatedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
  }
}

export type SerializedReview = ReturnType<typeof serializeReview>
export type PublicReview = Omit<SerializedReview, "status" | "moderatedAt" | "locale">

const toPublic = (review: SerializedReview): PublicReview => ({
  id: review.id,
  customerName: review.customerName,
  rating: review.rating,
  reviewText: review.reviewText,
  destination: review.destination,
  tripType: review.tripType,
  photoUrl: review.photoUrl,
  photoWidth: review.photoWidth,
  photoHeight: review.photoHeight,
  createdAt: review.createdAt,
})

/** A new customer review. Always PENDING; nothing is published here. */
export async function createReview(data: ReviewData, photo: File | null) {
  const stored = photo && photo.size > 0 ? await storeImageUpload(photo, "reviews", { maxBytes: REVIEW_PHOTO_MAX_BYTES, maxDimension: 1600, field: "photo" }) : null
  try {
    const review = await getPrisma().review.create({
      data: {
        customerName: data.customerName,
        rating: data.rating,
        reviewText: data.reviewText,
        destination: data.destination,
        tripType: data.tripType,
        locale: data.locale,
        status: "PENDING",
        photoUrl: stored?.url ?? null,
        photoKey: stored?.key ?? null,
        photoWidth: stored?.width ?? null,
        photoHeight: stored?.height ?? null,
      },
    })
    return review
  } catch (error) {
    await removeStoredImage(stored?.key)
    throw error
  }
}

/** Approved reviews, newest first. Empty (never an error page) if the database is unavailable. */
export async function listApprovedReviews(limit = 200): Promise<PublicReview[]> {
  try {
    const rows = await getPrisma().review.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: limit })
    return rows.map(serializeReview).map(toPublic)
  } catch (error) {
    logger.error("reviews_public_unavailable", describeError(error))
    return []
  }
}

// ─── Admin ────────────────────────────────────────────────────

export async function adminListReviews(query: { status?: ReviewStatus; page: number; pageSize: number; search?: string }) {
  const where: Prisma.ReviewWhereInput = {}
  if (query.status) where.status = query.status
  const search = query.search?.trim()
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { destination: { contains: search, mode: "insensitive" } },
      { reviewText: { contains: search, mode: "insensitive" } },
    ]
  }
  const prisma = getPrisma()
  const [total, rows, groups] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
  ])
  const counts: Record<ReviewStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  for (const group of groups) counts[group.status] = (group._count as { _all: number })._all
  return {
    reviews: rows.map(serializeReview),
    counts,
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  }
}

async function findReview(id: string) {
  const review = await getPrisma().review.findUnique({ where: { id } })
  if (!review) throw new AppError("NOT_FOUND", "Review not found.", 404)
  return review
}

export type ReviewUpdate = {
  status?: ReviewStatus
  customerName?: string
  destination?: string
  tripType?: TravelType | null
  removePhoto?: boolean
}

export async function updateReview(id: string, update: ReviewUpdate) {
  const existing = await findReview(id)
  const removePhoto = update.removePhoto && existing.photoKey
  const review = await getPrisma().review.update({
    where: { id },
    data: {
      status: update.status,
      moderatedAt: update.status && update.status !== existing.status ? new Date() : undefined,
      customerName: update.customerName,
      destination: update.destination,
      tripType: update.tripType,
      ...(update.removePhoto ? { photoUrl: null, photoKey: null, photoWidth: null, photoHeight: null } : {}),
    },
  })
  if (removePhoto) await removeStoredImage(existing.photoKey)
  refreshPublicPages()
  return serializeReview(review)
}

export async function deleteReview(id: string) {
  const existing = await findReview(id)
  await getPrisma().review.delete({ where: { id } })
  await removeStoredImage(existing.photoKey)
  refreshPublicPages()
  return { customerName: existing.customerName, destination: existing.destination }
}

export async function countPendingReviews(): Promise<number> {
  return getPrisma().review.count({ where: { status: "PENDING" } })
}
