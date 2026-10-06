"use client"

import type { ReactNode } from "react"
import { LazyMotion, MotionConfig, domAnimation } from "motion/react"

/**
 * Loads only the DOM animation feature set, and honours the visitor's
 * reduced-motion preference for every animation below it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
