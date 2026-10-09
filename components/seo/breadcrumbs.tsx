import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import type { Crumb } from "@/lib/seo/structured-data"
import { cn } from "@/lib/utils/cn"

/** "Home › Destinations › Lonavala": where this page sits. The last item is the current page. */
export function Breadcrumbs({ crumbs, label, className }: { crumbs: Crumb[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 opacity-60" /> : null}
              {current ? (
                <span aria-current="page" className="font-semibold">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className={cn("rounded-sm underline-offset-4 opacity-80 transition hover:underline hover:opacity-100", focusRing)}>
                  {crumb.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
