"use client"

import Image from "next/image"
import { useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, m } from "motion/react"
import { Lightbox, type LightboxItem } from "@/components/media/lightbox"
import { easeOut } from "@/components/motion/reveal"
import { focusRing } from "@/components/ui/styles"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import type { PublicGalleryItem } from "@/server/content/gallery"
import type { TravelTypeKey } from "@/types/home"

const tripTypeOrder: TravelTypeKey[] = ["FAMILY", "GROUP", "PILGRIMAGE", "CORPORATE", "OUTSTATION"]

type Labels = {
  filterLabel: string
  all: string
  tripTypes: Record<TravelTypeKey, string>
  emptyFiltered: string
  openPhoto: string
  lightbox: { close: string; previous: string; next: string; counter: string }
}

function formatMonth(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** Travel memory wall: natural proportions, trip-type filters and a lightbox. */
export function GalleryWall({ items, labels, locale, empty }: { items: PublicGalleryItem[]; labels: Labels; locale: Locale; empty: ReactNode }) {
  const [filter, setFilter] = useState<TravelTypeKey | "ALL">("ALL")
  const [open, setOpen] = useState<number | null>(null)

  const shown = useMemo(() => (filter === "ALL" ? items : items.filter((item) => item.tripType === filter)), [items, filter])

  const lightboxItems: LightboxItem[] = shown.map((item) => ({
    id: item.id,
    src: item.imageUrl,
    alt: item.altText || item.title,
    title: item.title,
    caption: item.caption,
    details: [item.destination, item.tripType ? labels.tripTypes[item.tripType] : null, item.tripDate ? formatMonth(item.tripDate, locale) : null].filter(
      (detail): detail is string => Boolean(detail),
    ),
  }))

  if (items.length === 0) return <>{empty}</>

  return (
    <div>
      <div role="group" aria-label={labels.filterLabel} className="-mx-1 flex flex-wrap gap-2">
        {(["ALL", ...tripTypeOrder] as const).map((key) => {
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className={cn(
                "min-h-11 rounded-pill px-4 text-sm font-semibold transition-colors",
                active ? "bg-forest text-white" : "bg-ivory text-forest ring-1 ring-line hover:ring-forest/30",
                focusRing,
              )}
            >
              {key === "ALL" ? labels.all : labels.tripTypes[key]}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: easeOut }} className="mt-8">
          {shown.length === 0 ? (
            <p className="rounded-card border border-dashed border-line bg-stone px-6 py-10 text-center text-muted">{labels.emptyFiltered}</p>
          ) : (
            <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
              {shown.map((item, index) => (
                <li key={item.id} className="break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setOpen(index)}
                    aria-label={`${labels.openPhoto}: ${item.title}`}
                    className={cn("group relative block w-full overflow-hidden rounded-card bg-stone-deep text-left", focusRing)}
                  >
                    <span className="zoom-img block">
                      <Image
                        src={item.imageUrl}
                        alt={item.altText || item.title}
                        width={item.width ?? 1200}
                        height={item.height ?? 900}
                        sizes="(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
                        className="h-auto w-full"
                        loading={index < 3 ? "eager" : "lazy"}
                      />
                    </span>
                    {item.destination || item.tripType ? (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/80 to-transparent px-4 pt-10 pb-3">
                        {item.destination ? <span className="block text-xs font-extrabold tracking-[0.16em] text-white uppercase">{item.destination}</span> : null}
                        {item.tripType ? <span className="block text-xs font-medium text-white/80">{labels.tripTypes[item.tripType]}</span> : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </m.div>
      </AnimatePresence>

      <Lightbox items={lightboxItems} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} labels={labels.lightbox} />
    </div>
  )
}
