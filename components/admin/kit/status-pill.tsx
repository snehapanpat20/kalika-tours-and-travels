import { cn } from "@/lib/utils/cn"

export type ContentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "SCHEDULED"
  | "ACTIVE"
  | "EXPIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"
  | "CHANGES"
  | "BUILT_IN"
  | "DISABLED"

const styles: Record<ContentStatus, { label: string; className: string; dot: string }> = {
  DRAFT: { label: "Draft", className: "bg-stone-deep text-ink", dot: "bg-muted" },
  PUBLISHED: { label: "Published", className: "bg-success-soft text-success", dot: "bg-success" },
  SCHEDULED: { label: "Scheduled", className: "bg-teal-soft text-teal-deep", dot: "bg-teal" },
  ACTIVE: { label: "Active", className: "bg-success-soft text-success", dot: "bg-success" },
  EXPIRED: { label: "Expired", className: "bg-stone-deep text-muted", dot: "bg-muted/60" },
  PENDING: { label: "Pending", className: "bg-coral-soft text-forest-deep", dot: "bg-coral" },
  APPROVED: { label: "Approved", className: "bg-success-soft text-success", dot: "bg-success" },
  REJECTED: { label: "Rejected", className: "bg-stone-deep text-muted", dot: "bg-muted/60" },
  ARCHIVED: { label: "Archived", className: "bg-stone-deep text-muted", dot: "bg-muted/60" },
  CHANGES: { label: "Unpublished changes", className: "bg-coral-soft text-forest-deep", dot: "bg-coral" },
  BUILT_IN: { label: "Using website default", className: "bg-stone-deep text-ink", dot: "bg-forest/40" },
  DISABLED: { label: "Disabled", className: "bg-danger-soft text-danger", dot: "bg-danger" },
}

/** One consistent badge for every content and moderation status in the admin. */
export function StatusPill({ status, label, className }: { status: ContentStatus; label?: string; className?: string }) {
  const style = styles[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold whitespace-nowrap", style.className, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", style.dot)} />
      {label ?? style.label}
    </span>
  )
}
