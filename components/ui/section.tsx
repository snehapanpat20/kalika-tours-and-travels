import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

const spacingClass = {
  sm: "py-14 md:py-16",
  md: "py-16 md:py-20 lg:py-24",
  lg: "py-(--spacing-section)",
} as const

const toneClass = {
  default: "bg-transparent text-ink",
  ivory: "bg-ivory text-ink",
  stone: "bg-stone text-ink",
  forest: "bg-forest text-white",
} as const

export function Section({
  children,
  className,
  id,
  spacing = "md",
  tone = "default",
  labelledBy,
}: {
  children: ReactNode
  className?: string
  id?: string
  spacing?: keyof typeof spacingClass
  tone?: keyof typeof toneClass
  labelledBy?: string
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn(spacingClass[spacing], toneClass[tone], className)}>
      {children}
    </section>
  )
}
