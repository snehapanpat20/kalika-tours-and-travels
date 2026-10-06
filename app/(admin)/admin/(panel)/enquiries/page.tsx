import type { Metadata } from "next"
import { EnquiryFilters } from "@/components/admin/enquiry-filters"
import { EnquiryTable } from "@/components/admin/enquiry-table"
import { Pagination } from "@/components/admin/pagination"
import { RefreshButton } from "@/components/admin/refresh-button"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { listQuerySchema } from "@/server/admin/schemas"
import { requireAdminPage } from "@/server/auth/admin-page"
import { listEnquiries } from "@/server/enquiries/service"

export const metadata: Metadata = { title: "Enquiries" }

const PAGE_SIZE = 20

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""),
  )
  const returnTo = `/admin/enquiries${Object.keys(raw).length ? `?${new URLSearchParams(raw)}` : ""}`
  await requireAdminPage(returnTo, "enquiries.read")

  // Same validation as the API; a hand-edited URL with bad values falls back to defaults
  const parsed = listQuerySchema.safeParse({ ...raw, pageSize: PAGE_SIZE })
  const query = parsed.success ? parsed.data : listQuerySchema.parse({ pageSize: PAGE_SIZE })
  const { enquiries, pagination } = await listEnquiries(query)
  const filtered = Boolean(query.search || query.status || query.travelType || query.from || query.to || query.travelFrom || query.travelTo)

  // Filters to carry through pagination links (page itself is set per link)
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page"))

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-forest sm:text-3xl">Enquiries</h1>
          <p className="mt-1 text-muted">Every trip enquiry from the website. Search by name, phone, email or destination; select one to see details and update its status.</p>
        </div>
        <RefreshButton />
      </header>

      <EnquiryFilters />

      <EnquiryTable
        enquiries={enquiries}
        caption="Enquiries"
        empty={
          filtered ? (
            <EmptyState
              title="No matching enquiries"
              description="Try a different search, or clear the filters."
              action={
                <Button href="/admin/enquiries" variant="outline" size="sm">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState title="No enquiries yet" description="New travel enquiries from your website will appear here." />
          )
        }
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
