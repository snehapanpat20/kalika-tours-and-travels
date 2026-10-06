import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** Previous / next links that keep the current filters. */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  params,
  basePath = "/admin/enquiries",
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  params: Record<string, string>
  basePath?: string
}) {
  if (total === 0) return null
  const href = (target: number) => {
    const query = new URLSearchParams(params)
    if (target > 1) query.set("page", String(target))
    else query.delete("page")
    const text = query.toString()
    return `${basePath}${text ? `?${text}` : ""}`
  }
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const linkClass = cn(
    "inline-flex min-h-11 items-center gap-1 rounded-pill bg-ivory px-4 text-sm font-semibold text-forest ring-1 ring-line hover:ring-forest/30",
    focusRing,
  )

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-ink">{first}–{last}</span> of <span className="font-semibold text-ink">{total}</span>
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={linkClass} scroll={false}>
              <ChevronLeft aria-hidden="true" className="size-4" /> Previous
            </Link>
          ) : null}
          <span className="px-2 text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href(page + 1)} className={linkClass} scroll={false}>
              Next <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  )
}
