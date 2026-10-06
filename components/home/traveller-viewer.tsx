"use client"

import Image from "next/image"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { AnimatePresence, m } from "motion/react"
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react"
import { easeOut } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type ViewerPhoto = { id: string; src: string | null; alt: string; caption: string; position?: string }

type ViewerCopy = {
  open: string
  title: string
  description: string
  close: string
  previous: string
  next: string
  counter: string
}

/** "View our Traveller": opens a modal photo viewer built on the native <dialog>. */
export function TravellerViewer({ photos, copy }: { photos: ViewerPhoto[]; copy: ViewerCopy }) {
  const ref = useRef<HTMLDialogElement>(null)
  const thumbsRef = useRef<HTMLUListElement>(null)
  const titleId = useId()
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const count = photos.length
  const photo = photos[index]

  const go = (delta: number) => setIndex((value) => (value + delta + count) % count)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Keep the active thumbnail visible in the strip
  useEffect(() => {
    if (!open) return
    const thumb = thumbsRef.current?.children[index] as HTMLElement | undefined
    thumb?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [index, open])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") go(1)
    if (event.key === "ArrowLeft") go(-1)
  }

  return (
    <>
      <Button size="lg" arrow onClick={() => setOpen(true)} icon={<Images aria-hidden="true" strokeWidth={1.8} className="-ml-1 size-[1.125rem]" />}>
        {copy.open}
      </Button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onKeyDown={onKeyDown}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false)
        }}
        className="w-full max-w-5xl"
      >
        <div className="overflow-hidden rounded-panel bg-forest-deep text-white shadow-overlay">
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
            <div>
              <h2 id={titleId} className="type-h3">
                {copy.title}
              </h2>
              <p className="mt-1 text-sm text-white/60">{copy.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.close}
              className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20", focusRing)}
            >
              <X aria-hidden="true" strokeWidth={1.8} className="size-5" />
            </button>
          </div>

          <div className="relative h-[min(58vh,34rem)] overflow-hidden bg-black/30 sm:h-[min(62vh,40rem)]">
            <AnimatePresence initial={false} mode="popLayout">
              <m.div
                key={photo.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: easeOut }}
              >
                {photo.src ? (
                  <>
                    {/* Blurred fill behind, whole photograph in front: portrait and landscape both show uncropped */}
                    <Image src={photo.src} alt="" aria-hidden="true" fill sizes="10vw" className="scale-110 object-cover opacity-50 blur-2xl" />
                    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 64rem, 100vw" className="object-contain" />
                  </>
                ) : (
                  <div role="img" aria-label={photo.alt} className="image-frame absolute inset-0" />
                )}
              </m.div>
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-6">
              <p className="text-sm font-semibold sm:text-base" aria-live="polite">
                <span className="sr-only">
                  {copy.counter.replace("{current}", String(index + 1)).replace("{total}", String(count))}:{" "}
                </span>
                {photo.caption}
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={copy.previous}
                  className={cn("inline-flex size-11 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/30", focusRing)}
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={copy.next}
                  className={cn("inline-flex size-11 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/30", focusRing)}
                >
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </div>
            </div>
          </div>

          <ul ref={thumbsRef} className="scroller flex gap-2 overflow-x-auto p-3 sm:gap-3 sm:p-4">
            {photos.map((item, itemIndex) => (
              <li key={item.id} className="w-24 shrink-0 sm:w-32">
                <button
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  aria-label={item.caption}
                  aria-current={itemIndex === index ? "true" : undefined}
                  className={cn(
                    "relative block aspect-[4/3] w-full overflow-hidden rounded-lg ring-2 transition",
                    itemIndex === index ? "opacity-100 ring-coral" : "opacity-55 ring-transparent hover:opacity-90",
                    focusRing,
                  )}
                >
                  {item.src ? <Image src={item.src} alt="" fill sizes="160px" className="object-cover" /> : <span className="image-frame absolute inset-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}
