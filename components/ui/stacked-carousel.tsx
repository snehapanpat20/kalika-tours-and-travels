"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"
import { animate, m, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type StackedSlide = {
  key: string
  /** Image address, already resolved on the server. */
  image: string
  /** CSS object-position, to keep the subject in frame. */
  position?: string
  alt: string
  title: string
  description: string
  /** Small label in the corner of the card. */
  badge?: string
  /** Where the slide leads, and what its link says. */
  href: string
  linkLabel: string
}

/** How far cards fan out and how a drag maps to slides, per screen width. */
const configs = {
  small: { distanceDivisor: 120, sensitivity: 180, xMultiplier: 90, yMultiplier: 20, rotationMultiplier: 8, scaleReduction: 0.06 },
  medium: { distanceDivisor: 160, sensitivity: 220, xMultiplier: 130, yMultiplier: 30, rotationMultiplier: 10, scaleReduction: 0.09 },
  large: { distanceDivisor: 200, sensitivity: 250, xMultiplier: 170, yMultiplier: 40, rotationMultiplier: 12, scaleReduction: 0.12 },
} as const

type Tier = keyof typeof configs
type Config = (typeof configs)[Tier]

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange)
  return () => window.removeEventListener("resize", onChange)
}
const currentTier = (): Tier => (window.innerWidth < 640 ? "small" : window.innerWidth < 1024 ? "medium" : "large")

/** A drag shorter than this (in pixels) counts as a click. */
const CLICK_SLOP = 6

/**
 * A fanned stack of photo cards: the current one upright in the middle, its
 * neighbours tilted behind it. Drag or swipe sideways, use the arrow buttons,
 * or click a side card to bring it forward; click the middle card (or the
 * link below) to follow it.
 *
 * Motion runs through the app's LazyMotion provider, so this uses `m.*` and
 * handles dragging itself with pointer events (the lightweight feature set
 * has no drag gesture).
 */
export function StackedCarousel({ slides, label, previous, next }: { slides: StackedSlide[]; label: string; previous: string; next: string }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const progress = useMotionValue(0)
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null)
  const [active, setActive] = useState(0)
  const tier = useSyncExternalStore(subscribeResize, currentTier, (): Tier => "large")
  const config = configs[tier]
  const total = slides.length

  if (!total) return null
  const current = slides[active] ?? slides[0]

  function goTo(target: number) {
    setActive(((target % total) + total) % total)
    if (reduce) progress.set(target)
    else animate(progress, target, { type: "spring", stiffness: 200, damping: 30, mass: 1 })
  }

  const step = (direction: 1 | -1) => goTo(Math.round(progress.get()) + direction)

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    drag.current = { x: event.clientX, start: progress.get(), moved: false }
    // Keep receiving the drag if the pointer leaves the stage; not every pointer can be captured
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The drag still works while the pointer stays over the stage
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    const dx = event.clientX - state.x
    if (Math.abs(dx) > CLICK_SLOP) state.moved = true
    if (state.moved) progress.set(state.start - dx / config.sensitivity)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    drag.current = null
    if (!state) return
    const dx = event.clientX - state.x

    if (!state.moved) {
      // A click: the middle of the stage follows the current card, the sides bring a neighbour forward
      const box = event.currentTarget.getBoundingClientRect()
      const offset = (event.clientX - (box.left + box.width / 2)) / config.xMultiplier
      if (Math.abs(offset) < 0.6) router.push(current.href)
      else goTo(Math.round(state.start) + Math.sign(offset) * Math.min(2, Math.round(Math.abs(offset))))
      return
    }

    const shift = Math.max(-3, Math.min(3, Math.round(-dx / config.distanceDivisor)))
    goTo(Math.round(state.start) + shift)
  }

  const arrow =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-forest ring-1 ring-forest/20 transition-colors duration-300 hover:bg-forest hover:text-white"

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} className="flex w-full flex-col items-center select-none">
      <div className="relative flex h-80 w-full max-w-7xl items-center justify-center sm:h-112 lg:h-128">
        {/* The stage: takes drags, swipes and clicks. Sideways only, so the page still scrolls up and down. */}
        <div
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            const state = drag.current
            drag.current = null
            if (state) goTo(Math.round(state.start))
          }}
          className="absolute inset-0 z-[200] cursor-grab touch-pan-y active:cursor-grabbing"
        />

        {slides.map((slide, index) => (
          <Card key={slide.key} slide={slide} index={index} total={total} progress={progress} config={config} current={index === active} />
        ))}
      </div>

      {/* The current place, as real text and a real link, with the arrows either side */}
      <div className="mt-2 flex w-full max-w-xl items-center justify-between gap-4 px-5">
        <button type="button" onClick={() => step(-1)} aria-label={previous} className={cn(arrow, focusRing)} disabled={total < 2}>
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
        <p aria-live="polite" className="min-w-0 text-center">
          <Link
            href={current.href}
            className={cn("group inline-flex min-h-11 items-center gap-1.5 font-medium text-teal-deep underline-offset-4 hover:underline", focusRing)}
          >
            <span className="truncate">
              {current.linkLabel}: {current.title}
            </span>
            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        </p>
        <button type="button" onClick={() => step(1)} aria-label={next} className={cn(arrow, focusRing)} disabled={total < 2}>
          <ArrowRight aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
      </div>
    </div>
  )
}

function Card({
  slide,
  index,
  total,
  progress,
  config,
  current,
}: {
  slide: StackedSlide
  index: number
  total: number
  progress: MotionValue<number>
  config: Config
  current: boolean
}) {
  // Signed distance from the middle of the stack, wrapping round the ends
  const offset = useTransform(progress, (value) => {
    let diff = (index - value) % total
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return diff
  })

  const x = useTransform(offset, (o) => o * config.xMultiplier)
  const rotate = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : o * config.rotationMultiplier))
  const y = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : Math.abs(o) * config.yMultiplier))
  const scale = useTransform(offset, (o) => 1 - Math.abs(o) * config.scaleReduction)
  const opacity = useTransform(offset, [-total / 2, -total / 2 + 0.5, 0, total / 2 - 0.5, total / 2], [0, 1, 1, 1, 0])
  const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10))
  const dim = useTransform(offset, [-2, -0.5, 0, 0.5, 2], [0.5, 0.2, 0, 0.2, 0.5])
  const words = useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0])

  return (
    <m.div
      aria-hidden={!current}
      style={{ x, rotate, y, scale, opacity, zIndex }}
      className="pointer-events-none absolute h-56 w-44 overflow-hidden rounded-2xl bg-stone-deep shadow-card sm:h-80 sm:w-56 lg:h-96 lg:w-64"
    >
      <Image
        src={slide.image}
        alt={slide.alt}
        fill
        sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 11rem"
        style={slide.position ? { objectPosition: slide.position } : undefined}
        className="object-cover"
        draggable={false}
      />

      {/* Cards behind the current one are dimmed */}
      <m.div style={{ opacity: dim }} className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

      {slide.badge ? (
        <Badge className="absolute top-3 right-3 bg-white/95 text-[0.6875rem] font-bold tracking-widest text-ink uppercase sm:top-5 sm:right-5">{slide.badge}</Badge>
      ) : null}

      <div className="absolute right-3 bottom-5 left-3 text-center text-white sm:right-5 sm:bottom-8 sm:left-5 sm:text-left">
        <m.p style={{ opacity: words }} className="font-display text-lg leading-tight font-semibold sm:text-2xl">
          {slide.title}
        </m.p>
        <m.p style={{ opacity: words }} className="mt-1 hidden text-xs leading-relaxed text-white/75 sm:line-clamp-2 sm:block">
          {slide.description}
        </m.p>
      </div>
    </m.div>
  )
}
