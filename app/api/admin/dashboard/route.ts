import { apiRoute, ok, preflight } from "@/server/api/http"
import { requireAdmin } from "@/server/auth/admin-session"
import { countPublishedPhotos } from "@/server/content/gallery"
import { adminActiveOffers, countActiveOffers } from "@/server/cms/offers"
import { adminListReviews, countPendingReviews } from "@/server/content/reviews"
import { getDashboardStats, listUpcomingTrips } from "@/server/enquiries/service"

/** GET /api/admin/dashboard: enquiry counts, recent and upcoming enquiries, reviews awaiting approval and active offers. */
export const GET = apiRoute(
  async (request) => {
    await requireAdmin(request, "dashboard.read")
    const [stats, pendingReviews, publishedPhotos, activeOffers, upcomingTrips, awaiting, offers] = await Promise.all([
      getDashboardStats(),
      countPendingReviews(),
      countPublishedPhotos(),
      countActiveOffers(),
      listUpcomingTrips(),
      adminListReviews({ status: "PENDING", page: 1, pageSize: 3 }),
      adminActiveOffers(),
    ])
    return ok({ ...stats, pendingReviews, publishedPhotos, activeOffers, upcomingTrips, reviewsAwaiting: awaiting.reviews, currentOffers: offers })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET"])
