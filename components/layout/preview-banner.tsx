import { Eye } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** Shown only to a signed-in admin previewing unpublished content. */
export function PreviewBanner({ label, exitLabel, exitHref }: { label: string; exitLabel: string; exitHref: string }) {
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex max-w-full items-center gap-3 rounded-pill bg-ink py-2 pr-2 pl-4 text-sm text-white shadow-overlay">
        <Eye aria-hidden="true" className="size-4 shrink-0 text-coral" />
        <span className="min-w-0 truncate font-semibold">{label}</span>
        {/* A plain link: prefetching an exit link would end the preview by itself */}
        <a href={exitHref} className={cn("shrink-0 rounded-pill bg-white px-3 py-1.5 text-xs font-bold text-forest-deep hover:bg-ivory", focusRing)}>
          {exitLabel}
        </a>
      </div>
    </div>
  )
}
