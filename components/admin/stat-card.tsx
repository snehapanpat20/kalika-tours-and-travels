import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** A dashboard number. Links to the matching filtered enquiry list. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = "teal",
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  href: string
  accent?: "forest" | "coral" | "teal" | "success" | "neutral" | "danger"
}) {
  const iconTone = {
    forest: "bg-forest text-white",
    coral: "bg-coral-soft text-forest-deep",
    teal: "bg-teal-soft text-teal-deep",
    success: "bg-success-soft text-success",
    neutral: "bg-stone-deep text-forest",
    danger: "bg-danger-soft text-danger",
  }[accent]

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col rounded-card border border-line bg-ivory p-5 shadow-soft transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-card",
        focusRing,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <span className={cn("inline-flex size-9 items-center justify-center rounded-xl", iconTone)}>
          <Icon aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem]" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-forest tabular-nums sm:text-4xl">{value.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>
    </Link>
  )
}
