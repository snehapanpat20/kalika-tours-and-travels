import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

const tones = {
  neutral: "bg-stone text-forest",
  forest: "bg-forest text-white",
  teal: "bg-teal-soft text-teal-deep",
  coral: "bg-coral/15 text-forest",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
} as const

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: keyof typeof tones
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  )
}
