import type { Metadata } from "next"
import { OffersManager } from "@/components/admin/offers-manager"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { StatusTabs } from "@/components/admin/kit/status-tabs"
import { Pagination } from "@/components/admin/pagination"
import { UrlFilters } from "@/components/admin/url-filters"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { scheduleLabels, scheduleStatuses } from "@/lib/cms/schedule"
import { getImageOptions } from "@/server/admin/image-options"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListOffers, countOffersByStatus, offerListSchema } from "@/server/cms/offers"

export const metadata: Metadata = { title: "Offers" }

const emptyCopy = {
  ALL: { title: "No offers yet", description: "Add a festive or seasonal offer. It appears on the homepage between the dates you choose." },
  DRAFT: { title: "No draft offers", description: "Offers you save without publishing appear here." },
  SCHEDULED: { title: "No scheduled offers", description: "Published offers with a future start date appear here until they begin." },
  ACTIVE: { title: "No active offers", description: "No offer is showing on the website right now." },
  EXPIRED: { title: "No expired offers", description: "Offers move here automatically after their end date." },
} as const

export default async function AdminOffersPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  await requireAdminPage(withQuery("/admin/offers", raw), "offers.read")

  const parsed = offerListSchema.safeParse({ ...raw, pageSize: 24 })
  const query = parsed.success ? parsed.data : offerListSchema.parse({ pageSize: 24 })
  const [{ items, pagination }, counts, images] = await Promise.all([adminListOffers(query), countOffersByStatus(), getImageOptions()])
  const current = query.status ?? "ALL"
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page" && key !== "new"))
  const searchParam: Record<string, string> = query.search ? { search: query.search } : {}

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Offers" description="Festive and seasonal offers for the homepage. They switch on and off by themselves on the dates you set." />

      <StatusTabs
        label="Offer status"
        current={current}
        tabs={[
          { key: "ALL", label: "All", count: counts.ALL, href: withQuery("/admin/offers", searchParam) },
          ...scheduleStatuses.map((status) => ({
            key: status,
            label: scheduleLabels[status],
            count: counts[status],
            highlight: status === "ACTIVE",
            href: withQuery("/admin/offers", { ...searchParam, status }),
          })),
        ]}
      />

      <UrlFilters
        searchPlaceholder="Search offers"
        keep={["status"]}
        selects={[
          {
            key: "sort",
            label: "Sort",
            defaultValue: "order",
            options: [
              { value: "order", label: "Display order" },
              { value: "newest", label: "Recently added" },
              { value: "startsAt", label: "Start date" },
            ],
          },
        ]}
      />

      <OffersManager
        autoOpen={raw.new === "1"}
        offers={items}
        bundledImages={images.bundledImages}
        uploads={images.uploads}
        emptyState={
          query.search ? (
            <EmptyState
              title="No matching offers"
              description="Try a different search."
              action={
                <Button href={withQuery("/admin/offers", query.status ? { status: query.status } : {})} variant="outline" size="sm">
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState title={emptyCopy[current].title} description={emptyCopy[current].description} />
          )
        }
      />

      <Pagination basePath="/admin/offers" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
