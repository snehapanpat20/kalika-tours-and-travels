import type { Metadata } from "next"
import { travelTypeLabels, travelTypeOrder } from "@/components/admin/format"
import { GalleryManager } from "@/components/admin/gallery-manager"
import { Pagination } from "@/components/admin/pagination"
import { RefreshButton } from "@/components/admin/refresh-button"
import { UrlFilters } from "@/components/admin/url-filters"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { galleryListSchema } from "@/server/admin/content-schemas"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListGallery } from "@/server/content/gallery"
import { getStorageStatus } from "@/server/storage"
import { listBundledImages } from "@/server/storage/images"

export const metadata: Metadata = { title: "Gallery" }

const PAGE_SIZE = 24

export default async function AdminGalleryPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  await requireAdminPage(withQuery("/admin/gallery", raw), "gallery.read")

  const parsed = galleryListSchema.safeParse({ ...raw, pageSize: PAGE_SIZE })
  const query = parsed.success ? parsed.data : galleryListSchema.parse({ pageSize: PAGE_SIZE })
  const [{ items, counts, pagination }, bundledImages] = await Promise.all([adminListGallery(query), listBundledImages()])
  const storage = getStorageStatus()
  const filtered = Boolean(query.search || query.visibility || query.featured || query.tripType)
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page" && key !== "new"))

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-forest sm:text-3xl">Gallery</h1>
          <p className="mt-1 text-muted">
            Photos for the website gallery. {counts.published} published. Featured photos also appear on the homepage.
          </p>
        </div>
        <RefreshButton />
      </header>

      <UrlFilters
        searchPlaceholder="Title, caption or destination"
        selects={[
          {
            key: "visibility",
            label: "Visibility",
            emptyLabel: "All photos",
            options: [
              { value: "published", label: "Published" },
              { value: "draft", label: "Drafts" },
            ],
          },
          { key: "featured", label: "Featured", emptyLabel: "Any", options: [{ value: "yes", label: "Featured only" }] },
          { key: "tripType", label: "Trip type", emptyLabel: "All types", options: travelTypeOrder.map((type) => ({ value: type, label: travelTypeLabels[type] })) },
          {
            key: "sort",
            label: "Sort",
            defaultValue: "order",
            options: [
              { value: "order", label: "Website order" },
              { value: "newest", label: "Recently added" },
              { value: "tripDate", label: "Trip date" },
            ],
          },
        ]}
      />

      <GalleryManager
        autoOpen={raw.new === "1"}
        items={items}
        bundledImages={bundledImages}
        uploads={storage.enabled ? { enabled: true, persistent: storage.persistent } : { enabled: false, persistent: false, reason: storage.reason }}
        empty={
          filtered ? (
            <EmptyState
              title="No matching photos"
              description="Try a different search, or clear the filters."
              action={
                <Button href="/admin/gallery" variant="outline" size="sm">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState title="No photos yet" description="Add your first travel photo. The website gallery shows “New journeys are coming soon.” until one is published." />
          )
        }
      />

      <Pagination basePath="/admin/gallery" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
