"use client"

import { createContext, useContext, useRef, useSyncExternalStore, type ReactNode } from "react"
import { m, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react"

/**
 * "Zoom through" for the hero.
 *
 * Tablet and desktop: the hero holds in place for a short stretch of scrolling
 * while the camera pushes into the scene and the words
 * lift away; then the page carries on. Phones get a lighter version with no
 * pinning: a gentle zoom and fade as the hero scrolls off. Reduced-motion
 * visitors get neither, and the page scrolls normally.
 */

const wideQuery = "(min-width: 768px)"
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(wideQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** True on tablet-sized screens and up. False during server rendering. */
export function useWideScreen() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false)
}

type Zoom = { progress: MotionValue<number>; wide: boolean } | null

/**
 * Maps progress onto [from, to] between `start` and `end`, clamped.
 * Opacity uses this function form on purpose: Motion would otherwise hand a
 * plain opacity mapping to the browser's native ScrollTimeline, which measures
 * the wrong element inside a sticky container and leaves the text unfaded.
 */
const ramp = (start: number, end: number, from: number, to: number) => (value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return from + (to - from) * t
}

const ZoomContext = createContext<Zoom>(null)

/** Scroll track around the hero. Extra height on wider screens is the "pinned" distance. */
export function HeroZoomTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const wide = useWideScreen()
  // Pinned: 0 when the hero reaches the top, 1 when the extra track height has been scrolled
  const { scrollYProgress: pinned } = useScroll({ target: ref, offset: ["start start", "end end"] })
  // Not pinned: 0 at the top, 1 once the hero has scrolled out of view
  const { scrollYProgress: leaving } = useScroll({ target: ref, offset: ["start start", "end start"] })

  const zoom: Zoom = reduce ? null : { progress: wide ? pinned : leaving, wide }

  return (
    // Negative margin lets the hero sit under the fixed header, as before
    <div ref={ref} className="relative -mt-16 lg:-mt-20 motion-safe:md:h-[165svh]">
      <div className="motion-safe:md:sticky motion-safe:md:top-0">
        <ZoomContext.Provider value={zoom}>{children}</ZoomContext.Provider>
      </div>
    </div>
  )
}

/** Background layer: pushes into the scene and softens into the page colour. */
export function HeroZoomBackground({ children }: { children: ReactNode }) {
  const zoom = useContext(ZoomContext)
  const still = useMotionValue(0)
  const progress = zoom?.progress ?? still
  const scale = useTransform(progress, [0, 1], [1, zoom?.wide ? 1.28 : 1.12])
  const shade = useTransform(progress, ramp(0.35, 1, 0, zoom?.wide ? 0.45 : 0.25))

  return (
    <>
      {/* Origin at the heart of the collage, so the camera flies into it */}
      <m.div className="absolute inset-0 origin-[50%_62%] will-change-transform" style={{ scale: zoom ? scale : 1 }}>
        {children}
      </m.div>
      <m.div aria-hidden="true" className="absolute inset-0 bg-ivory" style={{ opacity: zoom ? shade : 0 }} />
    </>
  )
}

/** Hero words: fade and lift away early, so the scene takes over. */
export function HeroZoomContent({ children, className }: { children: ReactNode; className?: string }) {
  const zoom = useContext(ZoomContext)
  const still = useMotionValue(0)
  const progress = zoom?.progress ?? still
  const opacity = useTransform(progress, ramp(0, zoom?.wide ? 0.5 : 0.6, 1, 0))
  const y = useTransform(progress, [0, zoom?.wide ? 0.5 : 0.6], [0, zoom?.wide ? -64 : -32])

  return (
    <m.div className={className} style={zoom ? { opacity, y } : undefined}>
      {children}
    </m.div>
  )
}
