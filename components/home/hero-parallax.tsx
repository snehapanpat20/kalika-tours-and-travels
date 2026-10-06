"use client"

import type { ReactNode } from "react"
import { m, useReducedMotion, useScroll, useTransform } from "motion/react"
import { useWideScreen } from "@/components/home/hero-zoom"

/** Furthest the background drifts, in pixels. Small enough that the Traveller never visibly slides. */
const MAX_SHIFT = 16

/**
 * Lets the hero background trail the page slightly as it scrolls. Off on phones
 * (where it costs battery and adds little) and for reduced-motion visitors.
 * The layer is oversized top and bottom so its edges never show.
 */
export function HeroParallax({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const wide = useWideScreen()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 800], [0, MAX_SHIFT], { clamp: true })

  return (
    <m.div className="absolute inset-x-0 -top-6 -bottom-6" style={{ y: reduce || !wide ? 0 : y }}>
      {children}
    </m.div>
  )
}
