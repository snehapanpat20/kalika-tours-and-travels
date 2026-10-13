"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock } from "lucide-react"
import { m, useReducedMotion } from "motion/react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type CoverflowItem = {
  id: string
  /** Image address, already resolved on the server. A card without one is set in the brand colour. */
  image?: string | null
  /** CSS object-position, to keep the subject in frame. */
  position?: string
  title: string
  /** Short line under the title, e.g. the typical duration. */
  meta?: string
  description?: string
  /** Where the card leads, and what its link says. */
  href?: string
  linkLabel?: string
}

export type CoverflowCarouselProps = {
  items: CoverflowItem[]
  /** Name of the carousel for assistive technology. */
  ariaLabel: string
  /** Labels of the arrow buttons. */
  previous: string
  next: string
  /** Announced when the card changes, e.g. "Photo {current} of {total}". */
  counter: string
  /** After the last card, carry on from the first. */
  loop?: boolean
  autoplay?: boolean
  /** ms per card. */
  autoplayDelay?: number
  /** Degrees the side cards turn away. */
  rotation?: number
  /** How much smaller each card further from the middle is. */
  scaleStep?: number
  className?: string
}

/** Card size, the gap between cards and how far back the side ones sit, per screen width. */
const layouts = {
  small: { width: 216, height: 290, spacing: 128, depth: 120 },
  medium: { width: 264, height: 340, spacing: 190, depth: 160 },
  large: { width: 304, height: 384, spacing: 232, depth: 180 },
} as const

type Tier = keyof typeof layouts

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange)
  return () => window.removeEventListener("resize", onChange)
}
const currentTier = (): Tier => (window.innerWidth < 640 ? "small" : window.innerWidth < 1024 ? "medium" : "large")

const SWIPE_DISTANCE = 60
/** A drag shorter than this (in pixels) counts as a click. */
const CLICK_SLOP = 6
const MAX_VISIBLE_OFFSET = 3
const MIN_SCALE = 0.4

/**
 * A coverflow: the current card faces forward in the middle, its neighbours
 * turn away and step back on either side. Swipe sideways, click a side card,
 * use the arrow buttons or ←/→. The current card's details and its link sit
 * underneath as real text.
 *
 * Motion runs through the app's LazyMotion provider, so this uses `m.*` and
 * handles swipes itself with pointer events (the lightweight feature set has
 * no drag gesture).
 */
export function CoverflowCarousel({
  items,
  ariaLabel,
  previous,
  next,
  counter,
  loop = false,
  autoplay = false,
  autoplayDelay = 4000,
  rotation = 45,
  scaleStep = 0.15,
  className,
}: CoverflowCarouselProps) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const swipe = useRef<{ x: number; moved: boolean } | null>(null)
  const tier = useSyncExternalStore(subscribeResize, currentTier, (): Tier => "large")
  const layout = layouts[tier]
  const total = items.length

  const goTo = useCallback(
    (target: number) => {
      setActive(loop ? ((target % total) + total) % total : Math.min(Math.max(target, 0), total - 1))
    },
    [loop, total],
  )

  useEffect(() => {
    if (!autoplay || reduce || paused || total <= 1) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (loop || index < total - 1 ? (index + 1) % total : 0))
    }, autoplayDelay)
    return () => window.clearInterval(timer)
  }, [autoplay, reduce, paused, autoplayDelay, loop, total])

  if (!total) return null
  const current = items[active] ?? items[0]

  /** Signed distance of a card from the middle; with `loop` it wraps round the ends. */
  const offsetOf = (index: number) => {
    let offset = index - active
    if (loop && total > 2) {
      if (offset > total / 2) offset -= total
      if (offset < -total / 2) offset += total
    }
    return offset
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") goTo(active + 1)
    else if (event.key === "ArrowLeft") goTo(active - 1)
    else return
    event.preventDefault()
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    swipe.current = { x: event.clientX, moved: false }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = swipe.current
    if (state && Math.abs(event.clientX - state.x) > CLICK_SLOP) state.moved = true
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = swipe.current
    swipe.current = null
    if (!state) return
    const dx = event.clientX - state.x
    if (state.moved) {
      if (dx <= -SWIPE_DISTANCE) goTo(active + 1)
      else if (dx >= SWIPE_DISTANCE) goTo(active - 1)
      return
    }
    // A click on a side card brings it to the middle
    const card = (event.target as HTMLElement).closest("[data-index]")
    if (card) goTo(Number(card.getAttribute("data-index")))
  }

  const arrow =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-forest ring-1 ring-forest/20 transition-colors duration-300 hover:bg-forest hover:text-white disabled:pointer-events-none disabled:opacity-40"

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className={cn("relative w-full overflow-hidden outline-none select-none", focusRing, className)}
    >
      {/* The stage: sideways swipes only, so the page still scrolls up and down */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        className="relative mx-auto flex touch-pan-y items-center justify-center"
        style={{ height: layout.height + 48, perspective: reduce ? undefined : 1200 }}
      >
        {items.map((item, index) => {
          const offset = offsetOf(index)
          if (Math.abs(offset) > MAX_VISIBLE_OFFSET) return null
          const isActive = offset === 0
          const x = offset * layout.spacing
          return (
            <m.div
              key={item.id}
              data-index={index}
              aria-hidden={!isActive}
              initial={false}
              animate={
                reduce
                  ? { opacity: isActive ? 1 : 0, x }
                  : { opacity: 1, x, rotateY: -offset * rotation, z: -Math.abs(offset) * layout.depth, scale: Math.max(1 - Math.abs(offset) * scaleStep, MIN_SCALE) }
              }
              transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.1, duration: 0.45 }}
              style={{ width: layout.width, height: layout.height, zIndex: total - Math.abs(offset) }}
              className={cn("absolute overflow-hidden rounded-2xl bg-ink shadow-card", !isActive && "cursor-pointer")}
            >
              {item.image ? (
                <>
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 19rem, (min-width: 640px) 16.5rem, 13.5rem"
                    style={item.position ? { objectPosition: item.position } : undefined}
                    className="object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
                </>
              ) : (
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,var(--kalika-coral)_0%,transparent_70%)] opacity-60" />
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                {item.meta ? (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-highlight">
                    <Clock aria-hidden="true" strokeWidth={2} className="size-3.5" />
                    {item.meta}
                  </p>
                ) : null}
                <p className="mt-1.5 font-display text-2xl leading-tight font-semibold text-balance">{item.title}</p>
              </div>
            </m.div>
          )
        })}
      </div>

      {/* The current card, as real text and a real link, with the arrows either side */}
      <div className="mx-auto mt-2 flex w-full max-w-2xl items-start justify-between gap-4 px-5">
        <button type="button" onClick={() => goTo(active - 1)} aria-label={previous} disabled={!loop && active === 0} className={cn(arrow, focusRing)}>
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
        <div aria-live="polite" className="min-h-36 min-w-0 flex-1 text-center sm:min-h-32">
          <p className="sr-only">{counter.replace("{current}", String(active + 1)).replace("{total}", String(total))}</p>
          <h3 className="text-xl leading-tight text-forest sm:text-2xl">{current.title}</h3>
          {current.meta ? <p className="mt-1 text-sm font-medium text-teal-deep">{current.meta}</p> : null}
          {current.description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{current.description}</p> : null}
          {current.href && current.linkLabel ? (
            <Link
              href={current.href}
              className={cn("mt-1 inline-flex min-h-11 items-center gap-1.5 font-medium text-teal-deep underline-offset-4 hover:underline", focusRing)}
            >
              {current.linkLabel}
              <span className="sr-only">: {current.title}</span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          ) : null}
        </div>
        <button type="button" onClick={() => goTo(active + 1)} aria-label={next} disabled={!loop && active === total - 1} className={cn(arrow, focusRing)}>
          <ArrowRight aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
      </div>
    </div>
  )
}
