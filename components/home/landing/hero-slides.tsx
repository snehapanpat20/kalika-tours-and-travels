"use client"

import Image from "next/image"
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { Pause, Play } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type HeroSlide = { id: string; src: string; position?: string; alt: string; place: string }

type Slideshow = {
  slides: HeroSlide[]
  active: number
  setActive: (index: number) => void
  paused: boolean
  setPaused: (paused: boolean) => void
  reduce: boolean
  /** Photos that may load: those shown so far, and the next one. */
  ready: Set<number>
}

const SlideshowContext = createContext<Slideshow | null>(null)

function useSlideshow(): Slideshow {
  const value = useContext(SlideshowContext)
  if (!value) throw new Error("Hero slideshow parts must sit inside <HeroSlideshow>.")
  return value
}

/**
 * The hero's background photographs: each fades into the next every few
 * seconds while slowly zooming in. `HeroBackground` draws them;
 * `HeroSlideControls` names the place showing and offers one button per photo
 * and a pause button. Both read the state kept here, so they can sit in
 * different parts of the hero.
 *
 * Only the first photo loads with the page; each later one loads just before
 * its turn. Visitors who prefer reduced motion get no zoom and no automatic
 * changes. Without JavaScript the first photo simply stays.
 */
export function HeroSlideshow({ slides, seconds, children }: { slides: HeroSlide[]; seconds: number; children: ReactNode }) {
  const reduce = useReducedMotion() ?? false
  const [active, setActiveState] = useState(0)
  const activeRef = useRef(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(() => new Set([0, 1]))
  const total = slides.length
  const playing = !paused && !reduce && total > 1

  /** Shows a photo, and lets the one after it start loading ahead of its turn. */
  const setActive = useCallback(
    (index: number) => {
      activeRef.current = index
      setActiveState(index)
      const following = (index + 1) % total
      setReady((previous) => (previous.has(index) && previous.has(following) ? previous : new Set([...previous, index, following])))
    },
    [total],
  )

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((activeRef.current + 1) % total)
    }, seconds * 1000)
    return () => window.clearInterval(timer)
  }, [playing, seconds, total, setActive])

  return <SlideshowContext.Provider value={{ slides, active, setActive, paused, setPaused, reduce, ready }}>{children}</SlideshowContext.Provider>
}

export function HeroBackground() {
  const { slides, active, ready } = useSlideshow()
  return (
    <div className="absolute inset-0 -z-20 overflow-hidden bg-forest-deep">
      {slides.map((slide, index) =>
        ready.has(index) ? (
          <div key={slide.id} aria-hidden={index !== active} className={cn("hero-slide absolute inset-0", index === active && "is-active")}>
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              quality={75}
              preload={index === 0}
              className="hero-slide-img object-cover"
              style={slide.position ? { objectPosition: slide.position } : undefined}
            />
          </div>
        ) : null,
      )}
    </div>
  )
}

export function HeroSlideControls({ labels }: { labels: { nowShowing: string; group: string; show: string; pause: string; play: string } }) {
  const { slides, active, setActive, paused, setPaused, reduce } = useSlideshow()
  const current = slides[active] ?? slides[0]
  if (!current) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-xs font-medium tracking-[0.14em] text-white/80 uppercase">
        <span className="text-teal-light">{labels.nowShowing}:</span> {current.place}
      </p>
      {slides.length > 1 ? (
        <div role="group" aria-label={labels.group} className="flex items-center gap-1">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              aria-label={labels.show.replace("{n}", String(index + 1)).replace("{place}", slide.place)}
              className={cn("group inline-flex size-8 items-center justify-center rounded-full", focusRing)}
            >
              <span
                className={cn("block h-1.5 rounded-full transition-all duration-500", index === active ? "w-6 bg-teal-light" : "w-1.5 bg-white/55 group-hover:bg-white")}
              />
            </button>
          ))}
          {!reduce ? (
            <button
              type="button"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? labels.play : labels.pause}
              className={cn("ml-1 inline-flex size-8 items-center justify-center rounded-full text-white/80 hover:text-white", focusRing)}
            >
              {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
