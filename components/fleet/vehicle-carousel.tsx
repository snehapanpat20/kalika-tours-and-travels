"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type CarouselPhoto = { id: string; src: string; alt: string; position?: string }

/**
 * Photos of our vehicles, one at a time, each fading into the next after
 * about a second. It waits while the pointer is over it or focus is inside it;
 * using the arrows stops it (the play button starts it again). Visitors who
 * prefer reduced motion get no automatic changes, only the arrows. Without
 * JavaScript the first photo simply stays.
 *
 * Photos load as they come up, not all at once.
 */
export function VehicleCarousel({
  photos,
  labels,
  interval = 1000,
  className,
}: {
  photos: CarouselPhoto[]
  labels: { label: string; previous: string; next: string; pause: string; play: string; counter: string }
  /** Milliseconds each photo stays before the next fades in. */
  interval?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const total = photos.length
  const [active, setActiveState] = useState(0)
  const activeRef = useRef(0)
  const [stopped, setStopped] = useState(false)
  const [held, setHeld] = useState(false)
  const [ready, setReady] = useState(() => new Set([0, 1]))

  /** Shows a photo, and lets the one after it start loading. */
  const show = useCallback(
    (index: number) => {
      const next = ((index % total) + total) % total
      activeRef.current = next
      setActiveState(next)
      const following = (next + 1) % total
      setReady((previous) => (previous.has(next) && previous.has(following) ? previous : new Set([...previous, next, following])))
    },
    [total],
  )

  const playing = !reduce && !stopped && !held && total > 1
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (!document.hidden) show(activeRef.current + 1)
    }, interval)
    return () => window.clearInterval(timer)
  }, [playing, interval, show])

  if (!total) return null

  const step = (direction: 1 | -1) => {
    setStopped(true)
    show(activeRef.current + direction)
  }

  const button = cn(
    "inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-forest shadow-soft ring-1 ring-forest/10 transition-colors hover:bg-white",
    focusRing,
  )

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.label}
      className={cn("relative h-full w-full overflow-hidden bg-stone-deep", className)}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {photos.map((photo, index) =>
        ready.has(index) ? (
          <div
            key={photo.id}
            aria-hidden={index !== active}
            className={cn("absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none", index === active ? "opacity-100" : "opacity-0")}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
              style={photo.position ? { objectPosition: photo.position } : undefined}
            />
          </div>
        ) : null,
      )}

      {total > 1 ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-forest-deep/70 to-transparent p-4 pt-12">
          <p className="text-sm font-medium whitespace-nowrap text-white" aria-live={playing ? "off" : "polite"}>
            {labels.counter.replace("{current}", String(active + 1)).replace("{total}", String(total))}
          </p>
          <div className="flex items-center gap-2">
            {reduce ? null : (
              <button type="button" onClick={() => setStopped((value) => !value)} aria-label={stopped ? labels.play : labels.pause} className={button}>
                {stopped ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
              </button>
            )}
            <button type="button" onClick={() => step(-1)} aria-label={labels.previous} className={button}>
              <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="size-5" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={labels.next} className={button}>
              <ArrowRight aria-hidden="true" strokeWidth={1.8} className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
