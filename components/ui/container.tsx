import type { ReactNode } from "react"
import { shell } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

const widths = {
  narrow: "mx-auto w-full max-w-3xl px-5 sm:px-8",
  default: "mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10",
  wide: shell,
} as const

export function Container({
  children,
  className,
  width = "default",
}: {
  children: ReactNode
  className?: string
  width?: keyof typeof widths
}) {
  return <div className={cn(widths[width], className)}>{children}</div>
}
