import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-card border border-line bg-ivory p-6 text-ink shadow-card sm:p-8", className)}>
      {children}
    </div>
  )
}
