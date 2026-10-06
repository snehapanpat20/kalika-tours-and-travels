"use client"

import { useRef, type ReactNode } from "react"
import { m, useReducedMotion, useScroll, useTransform } from "motion/react"
import { cn } from "@/lib/utils/cn"

/**
 * Drifts its content vertically while the frame crosses the viewport.
 * The content is oversized by `range`% top and bottom so edges never show.
 * Place inside a positioned, overflow-hidden frame.
 */
export function Parallax({ children, range = 8, className }: { children: ReactNode; range?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${range}%`, `${range}%`])

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      <m.div
        className="absolute inset-x-0"
        style={{ top: `-${range}%`, bottom: `-${range}%`, y: reduce ? 0 : y }}
      >
        {children}
      </m.div>
    </div>
  )
}
