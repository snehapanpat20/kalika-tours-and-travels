import type { EnquiryStatus } from "@/generated/prisma/enums"
import { statusLabels } from "@/components/admin/format"
import { cn } from "@/lib/utils/cn"

/** One quiet colour per status; the dot carries the colour so text stays readable. */
const tone: Record<EnquiryStatus, { badge: string; dot: string }> = {
  NEW: { badge: "bg-coral-soft text-forest-deep", dot: "bg-coral" },
  CONTACTED: { badge: "bg-teal-soft text-teal-deep", dot: "bg-teal" },
  CONFIRMED: { badge: "bg-success-soft text-success", dot: "bg-success" },
  COMPLETED: { badge: "bg-stone-deep text-forest", dot: "bg-forest" },
  CANCELLED: { badge: "bg-danger-soft/70 text-danger", dot: "bg-danger/70" },
}

export const statusDotClass = (status: EnquiryStatus) => tone[status].dot

export function StatusBadge({ status, className }: { status: EnquiryStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold whitespace-nowrap", tone[status].badge, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone[status].dot)} />
      {statusLabels[status]}
    </span>
  )
}
