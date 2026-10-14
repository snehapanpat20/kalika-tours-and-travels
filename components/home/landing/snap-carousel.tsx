"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/**
 * A row of cards that scrolls sideways: swipe on touch screens (each card
 * snaps into place), or use the arrow buttons. The cards are ordinary list
 * items rendered on the server, so they stay readable and linkable without
 * JavaScript (the row then simply scrolls).
 *
 * With `autoplay` (ms) the row moves on by one card at a time, back to the
 * start after the end, and waits while the pointer is over it, focus is
 * inside it, the tab is hidden, or the visitor has paused it. Visitors who
 * prefer reduced motion get no automatic movement.
 */
export function SnapCarousel({
  children,
  label,
  previous,
  next,
  autoplay = 0,
  pause,
  play,
  tone = "light",
  className,
  listClassName,
}: {
  children: ReactNode
  /** Name of the carousel for assistive technology. */
  label: string
  previous: string
  next: string
  autoplay?: number
  pause?: string
  play?: string
  tone?: "light" | "dark"
  className?: string
  /** Classes for the scrolling list, e.g. the card widths. */
  listClassName?: string
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const reduce = useReducedMotion()
  const [held, setHeld] = useState(false)
  const [paused, setPaused] = useState(false)
  const [edges, setEdges] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const list = listRef.current
    if (!list) return
    setEdges({ start: list.scrollLeft <= 4, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    measure()
    list.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    return () => {
      list.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  /** Scrolls by one card; past the end, back to the start. */
  const step = useCallback(
    (direction: 1 | -1, wrap = false) => {
      const list = listRef.current
      if (!list) return
      const card = list.firstElementChild as HTMLElement | null
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0
      const distance = (card?.offsetWidth ?? list.clientWidth) + gap
      const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4
      const behavior = reduce ? "auto" : "smooth"
      if (wrap && direction === 1 && atEnd) list.scrollTo({ left: 0, behavior })
      else list.scrollBy({ left: direction * distance, behavior })
    },
    [reduce],
  )

  const playing = autoplay > 0 && !reduce && !paused && !held
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (!document.hidden) step(1, true)
    }, autoplay)
    return () => window.clearInterval(timer)
  }, [playing, autoplay, step])

  const button = cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-300 disabled:pointer-events-none disabled:opacity-35",
    tone === "dark" ? "text-white ring-white/30 hover:bg-white hover:text-forest" : "text-forest ring-forest/20 hover:bg-forest hover:text-white",
    focusRing,
  )

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={className}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <ul ref={listRef} className={cn("no-scrollbar relative flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 motion-reduce:scroll-auto", listClassName)}>
        {children}
      </ul>
      <div className="mt-4 flex items-center justify-end gap-2">
        {autoplay > 0 && !reduce && pause && play ? (
          <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? play : pause} className={button}>
            {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
          </button>
        ) : null}
        <button type="button" onClick={() => step(-1)} aria-label={previous} disabled={edges.start} className={button}>
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
        <button type="button" onClick={() => step(1)} aria-label={next} disabled={edges.end} className={button}>
          <ArrowRight aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
      </div>
    </div>
  )
}
