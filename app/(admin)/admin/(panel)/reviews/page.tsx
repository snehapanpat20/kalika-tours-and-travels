import type { Metadata } from "next"
import Link from "next/link"
import { reviewStatusLabels, reviewStatusOrder } from "@/components/admin/format"
import { Pagination } from "@/components/admin/pagination"
import { RefreshButton } from "@/components/admin/refresh-button"
import { ReviewModeration } from "@/components/admin/review-moderation"
import { UrlFilters } from "@/components/admin/url-filters"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"
import { reviewListSchema } from "@/server/admin/content-schemas"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListReviews } from "@/server/content/reviews"

export const metadata: Metadata = { title: "Reviews" }

const PAGE_SIZE = 20

const emptyCopy = {
  ALL: { title: "No reviews yet", description: "Reviews customers send from the website will appear here for you to approve." },
  PENDING: { title: "Nothing waiting", description: "You're all caught up. New reviews will appear here for moderation." },
  APPROVED: { title: "No approved reviews", description: "Approved reviews are shown on the website's Reviews page." },
  REJECTED: { title: "No rejected reviews", description: "Rejected reviews stay here, hidden from the website." },
} as const

export default async function AdminReviewsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  await requireAdminPage(withQuery("/admin/reviews", raw), "reviews.read")

  const parsed = reviewListSchema.safeParse({ ...raw, pageSize: PAGE_SIZE })
  const query = parsed.success ? parsed.data : reviewListSchema.parse({ pageSize: PAGE_SIZE })
  const { reviews, counts, pagination } = await adminListReviews(query)
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page"))
  const total = counts.PENDING + counts.APPROVED + counts.REJECTED

  const tabs = [
    { key: "ALL" as const, label: "All", count: total, href: withQuery("/admin/reviews", query.search ? { search: query.search } : {}) },
    ...reviewStatusOrder.map((status) => ({
      key: status,
      label: reviewStatusLabels[status],
      count: counts[status],
      href: withQuery("/admin/reviews", { status, ...(query.search ? { search: query.search } : {}) }),
    })),
  ]
  const current = query.status ?? "ALL"

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-forest sm:text-3xl">Reviews</h1>
          <p className="mt-1 text-muted">Customer reviews from the website. Only approved reviews are published.</p>
        </div>
        <RefreshButton />
      </header>

      <nav aria-label="Review status" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-2">
          {tabs.map((tab) => {
            const active = tab.key === current
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold whitespace-nowrap ring-1 transition-colors",
                    active ? "bg-forest text-white ring-forest" : "bg-ivory text-forest ring-line hover:ring-forest/30",
                    focusRing,
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.6875rem]",
                      active ? "bg-white/15" : tab.key === "PENDING" && tab.count > 0 ? "bg-coral text-forest-deep" : "bg-stone-deep text-muted",
                    )}
                  >
                    {tab.count}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <UrlFilters searchPlaceholder="Name, destination or review text" selects={[]} keep={["status"]} />

      <ReviewModeration
        reviews={reviews}
        empty={
          query.search ? (
            <EmptyState
              title="No matching reviews"
              description="Try a different search."
              action={
                <Button href={withQuery("/admin/reviews", query.status ? { status: query.status } : {})} variant="outline" size="sm">
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState title={emptyCopy[current].title} description={emptyCopy[current].description} />
          )
        }
      />

      <Pagination basePath="/admin/reviews" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
