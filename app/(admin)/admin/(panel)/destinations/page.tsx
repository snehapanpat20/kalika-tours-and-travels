import type { Metadata } from "next"
import { DestinationsManager } from "@/components/admin/destinations-manager"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { Pagination } from "@/components/admin/pagination"
import { UrlFilters } from "@/components/admin/url-filters"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { destinationCategoryLabels } from "@/lib/cms/labels"
import { getImageOptions } from "@/server/admin/image-options"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListDestinations, destinationListSchema } from "@/server/cms/destinations"

export const metadata: Metadata = { title: "Destinations" }

export default async function AdminDestinationsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  await requireAdminPage(withQuery("/admin/destinations", raw), "destinations.read")

  const parsed = destinationListSchema.safeParse({ ...raw, pageSize: 30 })
  const query = parsed.success ? parsed.data : destinationListSchema.parse({ pageSize: 30 })
  const [{ items, pagination, counts }, images] = await Promise.all([adminListDestinations(query), getImageOptions()])
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page"))

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Destinations" description="Places shown on the Destinations page and the homepage. Only published destinations appear on the website." />
      {counts.all > 0 ? (
        <UrlFilters
          searchPlaceholder="Name, state or description"
          selects={[
            { key: "category", label: "Category", emptyLabel: "All categories", options: Object.entries(destinationCategoryLabels).map(([value, label]) => ({ value, label })) },
            {
              key: "visibility",
              label: "Visibility",
              emptyLabel: "All",
              options: [
                { value: "published", label: "Published" },
                { value: "draft", label: "Not published" },
              ],
            },
          ]}
        />
      ) : null}
      <DestinationsManager
        items={items}
        totalAll={counts.all}
        bundledImages={images.bundledImages}
        uploads={images.uploads}
        emptyState={
          <EmptyState
            title="No destinations match"
            description="Try a different search or filter."
            action={
              <Button href="/admin/destinations" variant="outline" size="sm">
                Clear filters
              </Button>
            }
          />
        }
      />
      <Pagination basePath="/admin/destinations" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
