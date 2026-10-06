"use client"

import Image from "next/image"
import { useEffect, useId, useRef, type KeyboardEvent } from "react"
import { AnimatePresence, m } from "motion/react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { easeOut } from "@/components/motion/reveal"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type LightboxItem = {
  id: string
  src: string
  alt: string
  title?: string | null
  caption?: string | null
  /** Short labels shown under the photo, e.g. destination, trip type, date. */
  details?: string[]
}

type Labels = { close: string; previous: string; next: string; counter: string }

/**
 * Full-screen photo viewer on the native <dialog>: Escape closes it, focus
 * stays inside while open, arrow keys move between photos.
 */
export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
  labels,
}: {
  items: LightboxItem[]
  /** Open photo, or null when closed. */
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  labels: Labels
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const item = index === null ? null : items[index]
  const count = items.length

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  function go(delta: number) {
    if (index === null || count < 2) return
    onIndexChange((index + delta + count) % count)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") go(1)
    if (event.key === "ArrowLeft") go(-1)
  }

  const counter = index === null ? "" : labels.counter.replace("{current}", String(index + 1)).replace("{total}", String(count))
  const control = cn("inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20", focusRing)

  return (
    <dialog
      ref={ref}
      aria-labelledby={index === null ? undefined : titleId}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close()
      }}
      style={{ margin: "auto", maxWidth: "min(72rem, 100vw)", maxHeight: "100dvh" }}
      className="w-full bg-transparent p-0"
    >
      {item ? (
        <div className="flex max-h-dvh flex-col bg-forest-deep text-white sm:rounded-panel sm:shadow-overlay">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-xs font-semibold tracking-wide text-white/70" aria-live="polite">
              {counter}
            </p>
            <button type="button" onClick={() => ref.current?.close()} aria-label={labels.close} className={control}>
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 bg-black/30">
            <AnimatePresence initial={false} mode="popLayout">
              <m.div
                key={item.id}
                className="relative h-[min(70dvh,48rem)] w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: easeOut }}
              >
                <Image src={item.src} alt={item.alt} fill sizes="(min-width: 1152px) 72rem, 100vw" className="object-contain" />
              </m.div>
            </AnimatePresence>
            {count > 1 ? (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={labels.previous} className={cn(control, "absolute top-1/2 left-3 -translate-y-1/2 bg-black/40")}>
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={labels.next} className={cn(control, "absolute top-1/2 right-3 -translate-y-1/2 bg-black/40")}>
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="px-4 py-4 sm:px-6">
            <h2 id={titleId} className="text-base font-bold">
              {item.title || item.alt}
            </h2>
            {item.caption ? <p className="mt-1 max-w-3xl text-sm leading-6 text-white/80">{item.caption}</p> : null}
            {item.details?.length ? (
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold tracking-[0.12em] text-teal-light uppercase">
                {item.details.map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
