"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { m } from "motion/react"
import { easeOut } from "@/components/motion/reveal"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** Horizontal, snap-scrolling rail with previous / next controls. */
export function DestinationRail({
  children,
  label,
  previous,
  next,
}: {
  children: ReactNode
  label: string
  previous: string
  next: string
}) {
  const ref = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const rail = ref.current
    if (!rail) return
    setEdges({
      start: rail.scrollLeft <= 4,
      end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    update()
    const rail = ref.current
    if (!rail) return
    const observer = new ResizeObserver(update)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [update])

  function scroll(direction: 1 | -1) {
    const rail = ref.current
    if (!rail) return
    const card = rail.querySelector("li")
    const step = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    rail.scrollBy({ left: direction * step, behavior: smooth ? "smooth" : "auto" })
  }

  const button = "inline-flex size-12 items-center justify-center rounded-full ring-1 transition duration-300 disabled:cursor-default disabled:opacity-35"

  return (
    <div className="relative">
      <div className="rail mb-6 flex justify-end gap-2 md:absolute md:-top-24 md:right-0 md:mb-0">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={edges.start}
          aria-label={previous}
          className={cn(button, "text-forest ring-forest/20 enabled:hover:bg-forest enabled:hover:text-white", focusRing)}
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={edges.end}
          aria-label={next}
          className={cn(button, "text-forest ring-forest/20 enabled:hover:bg-forest enabled:hover:text-white", focusRing)}
        >
          <ArrowRight aria-hidden="true" strokeWidth={1.8} className="size-5" />
        </button>
      </div>

      <m.ul
        ref={ref}
        onScroll={update}
        aria-label={label}
        tabIndex={0}
        initial={{ opacity: 0, x: 80 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1, ease: easeOut }}
        className={cn("scroller rail flex gap-5 overflow-x-auto pb-4", focusRing)}
      >
        {children}
      </m.ul>
    </div>
  )
}
